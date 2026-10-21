const HOUR = 3_600_000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const historical = /\b(?:last\s+(?:week|month|year)|yesterday|\d+\s+(?:days?|weeks?|months?)\s+ago|no\s+new\s+reset)\b|上周|上个月|去年|昨天|\d+天前|没有(?:宣布)?新(?:的)?重置/i;
const completed = /\b(?:have|has|just|already)\b.{0,35}\breset\b|\bwe['’]ve\s+reset\b|\breset\b.{0,35}\b(?:complete(?:d)?|done|finished|live|now|happened|rolled out)\b|\b(?:we|i)\s+reset\b|\b(?:limits?|quota|usage)\b.{0,25}\b(?:are|were|was|have been|has been)\s+reset\b|已(?:经)?(?:全部)?重置|重置(?:已)?完成/i;
const future = /\b(?:will|going to|plan to|tomorrow)\b.{0,45}\breset\b|将.*重置|明天.*重置/i;

function currentCompletion(text) {
  return text.split(/[.!?;\n，。；]|\b(?:and|but)\b/i).some(clause=>
    /\b(?:just|now|today)\b|刚刚|刚才|今天/i.test(clause) && completed.test(clause)
    && !historical.test(clause) && !future.test(clause));
}

export const RESET_CLASSIFIER_VERSION = 'tibo-event-time-v2';

export function historicalResetReference(post) {
  // Only Tibo's own words can veto or assert a current event. A parent's
  // request or recollection is context, not an announcement by Tibo.
  const text=post.text ?? '';
  return /\bno\s+new\s+reset\b|\bnot\s+announc(?:e|ing)\b.{0,35}\breset\b|没有(?:宣布)?新(?:的)?重置/i.test(text)
    || historical.test(text) && !currentCompletion(text);
}

/** Resolve an announcement's event time without pretending publication is an
 * exact occurrence time. Old host signals remain usable for explicit new
 * completion statements; a bare kind alone cannot manufacture an event.
 */
export function completedResetEvent(post, now = Infinity) {
  const signal = post.signal;
  const published = Date.parse(post.createdAt);
  if (signal?.kind !== 'reset_completed' || !Number.isFinite(signal.confidence)
    || signal.confidence < .8 || signal.confidence > 1
    || !Number.isFinite(published) || published > now || historicalResetReference(post)
    || signal.resetTiming != null && signal.resetTiming !== 'current') return null;
  const standalone = /^\s*(?:Day\s*\d+\s*[/：:]?\s*)?Reset[.!\s]*$/i.test(post.text ?? '');
  const replyDone = post.activityType === 'reply' && /reset|重置/i.test(post.context ?? '')
    && /^\s*(?:done|all done|it's done|已完成|完成了)[.!。\s]*$/i.test(post.text ?? '');
  if (!completed.test(post.text ?? '') && !standalone && !replyDone) return null;
  if (future.test(post.text ?? '') && !currentCompletion(post.text ?? '')) return null;
  if (/\b(?:not|never|haven't|hasn't|didn't|won't)\b.{0,30}\breset\b|尚未重置|没有重置|不会重置/i.test(post.text ?? '')) return null;
  const literal = post.text?.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b/)?.[0];
  // A model copying createdAt is not evidence of an exact occurrence time.
  // Accept a literal ISO timestamp, or an explicit clock plus named zone.
  const clockWithZone=/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:UTC|GMT|PST|PDT)\b/i.test(post.text ?? '');
  const supplied = literal ? signal.resetOccurredAt ?? literal : clockWithZone ? signal.resetOccurredAt : undefined;
  if (supplied != null && (typeof supplied !== 'string' || !ISO.test(supplied))) return null;
  const at = supplied == null ? published : Date.parse(supplied);
  if (!Number.isFinite(at) || at > published || at > now || at < published - 72 * HOUR) return null;
  if (literal && supplied && Date.parse(literal) !== at) return null;
  return {at:new Date(at).toISOString(), reportedAt:new Date(published).toISOString(),
    timeBasis:supplied == null ? 'announcement' : 'explicit'};
}

/** Apply the same temporal boundary at LLM, fallback, and host entry points. */
export function normalizeResetSignalTime(post, signal) {
  if (signal.resetTiming != null && !['current', 'historical', 'unknown'].includes(signal.resetTiming))
    throw new Error('LLM 重置时间类型无效');
  if (signal.resetOccurredAt != null && (typeof signal.resetOccurredAt !== 'string'
    || !ISO.test(signal.resetOccurredAt) || !Number.isFinite(Date.parse(signal.resetOccurredAt))
    || Date.parse(signal.resetOccurredAt) > Date.parse(post.createdAt)))
    throw new Error('LLM 重置发生时间无效');
  if (signal.kind !== 'reset_completed') return signal;
  const event = completedResetEvent({...post,signal});
  if (!event) return {...signal, kind:'unknown', confidence:Math.min(signal.confidence,.5),
    resetTiming:historicalResetReference(post) || signal.resetTiming === 'historical' ? 'historical' : 'unknown'};
  const {resetOccurredAt:unused,...rest}=signal;
  return {...rest, resetTiming:'current',
    ...(event.timeBasis === 'explicit' ? {resetOccurredAt:event.at} : {})};
}
