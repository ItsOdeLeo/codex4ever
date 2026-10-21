import { classifyTiboPosts } from './llm-classifier.js';
import { campaignDay } from './reset-day-evidence.js';
import { RESET_CAMPAIGNS } from './reset-campaign.js';
import { completedResetEvent, normalizeResetSignalTime, RESET_CLASSIFIER_VERSION } from './reset-event-time.js';

export const RESET_HISTORY_URL = 'https://codex-resets.com/api/v1/resets?limit=100';
export const RESET_STATUS_URL = 'https://codex-resets.com/api/v1/status';
const HOUR = 3_600_000;
const resetRelated = post => /\breset(?:s|ting)?\b|重置/i.test(post.text+' '+post.context);
const tiboUrl = value => typeof value === 'string'
  && /^https:\/\/(?:x|twitter)\.com\/thsottiaux\/status\/\d+(?:[?#].*)?$/.test(value);

export function normalizeResetFeed(payload, now) {
  return (Array.isArray(payload?.data) ? payload.data : []).flatMap(record => {
    if(!record || typeof record!=='object')return [];
    const kind = { regular: 'automatic', banked: 'banked', both: 'automatic_and_banked' }[record.reset_type];
    const stamp = Date.parse(record.announced_at);
    if (!kind || !Number.isFinite(stamp) || stamp > now.getTime() || !tiboUrl(record.source?.url)) return [];
    return [{ at: new Date(stamp).toISOString(), kind, sourceUrl: record.source.url,
      text: typeof record.text === 'string' ? record.text.slice(0,5000) : '', id: String(record.id) }];
  });
}

function normalizePost(record, now) {
  if(!record || typeof record!=='object')return null;
  const sourceUrl = record.link ?? record.source?.url ?? record.url ?? record.sourceUrl;
  const createdAt = record.pubDate ?? record.createdAt ?? record.announced_at ?? record.created_at ?? record.observed_at;
  const stamp = Date.parse(createdAt), text = record.text ?? record.title;
  if (!tiboUrl(sourceUrl) || !Number.isFinite(stamp) || stamp > now.getTime()
    || stamp < now.getTime()-72*HOUR || typeof text !== 'string' || !text.trim()) return null;
  return { sourceUrl, createdAt: new Date(stamp).toISOString(), text: text.slice(0,5000),
    context: typeof record.context === 'string' ? record.context.slice(0,5000) : '',
    activityType: record.activityType === 'reply' || record.replyToGuid ? 'reply' : 'post' };
}

/** A conservative fallback when no standard LLM API is configured. */
export function classifyExplicitResetPost(post) {
  const own = post.text.toLowerCase(), context = post.context?.toLowerCase() ?? '';
  const quotaContext = /codex|usage|quota|limits|额度/.test(own+' '+context);
  const negated=/\b(?:not|never|won't|haven't|hasn't)\b.{0,35}\breset\b|不会重置|没有重置/.test(own);
  const uncertain=/\b(?:maybe|might|perhaps|could)\b|可能/.test(own);
  const resetMention=/reset|重置/.test(own) || post.activityType==='reply'
    && /^(?:yes\b|yep\b|landing\b|tomorrow\b|明天|会)/.test(own) && /reset|重置/.test(context);
  let kind = 'unknown';
  const day=campaignDay(post);
  if (/banked|reset credit|备用/.test(own)) kind='banked_credit';
  else if (negated) kind='unknown';
  else if (quotaContext && resetMention && !uncertain
    && /will|going to|tomorrow|lands? (?:in|at|by)|later|tonight|将|明天|今晚/.test(own)) kind='reset_planned';
  else if (quotaContext && /reset|重置/.test(own)
    && /have reset|has been|propagated|all reset|already|已/.test(own)) kind='reset_completed';
  else if(day!==null && /(?:^|\n)\s*reset[.!\s]*$|已重置|重置完成/.test(own))kind='reset_completed';
  else if (resetMention && uncertain && quotaContext) kind='reset_hint';
  else if (/launch|new feature|shipping|shipped|发布|新功能/.test(own)
    || day!==null && /landed|rolled out|introduced|optimized|faster|added compute|reduce|improvement|优化|改进/.test(own)) kind='new_feature';
  const hours = Number(own.match(/(?:next|in)\s+(\d{1,2})\s+hours?/)?.[1]);
  const validUntil = kind==='reset_planned' ? new Date(Date.parse(post.createdAt)
    + (hours>0 && hours<=72 ? hours : /tomorrow|明天/.test(own) ? 48 : 24)*HOUR).toISOString() : undefined;
  return { ...post, signal: normalizeResetSignalTime(post,{ kind, confidence: kind==='unknown' ? 0 : .8,
    reason: '本地明确语句分类；不是 LLM，也不是事件概率', ...(validUntil ? {validUntil} : {}),
    ...(day!==null ? {campaignDay:day} : {}) }) };
}

async function getJSON(url, fetchImpl, timeoutMs, headers={}) {
  const response = await fetchImpl(url,{headers:{accept:'application/json',...headers},signal:AbortSignal.timeout(timeoutMs)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  if (body.length>2_000_000) throw new Error('公开数据响应过大');
  return JSON.parse(body);
}

/** Optional authenticated public user timeline; replies are NOT excluded. */
export async function readTiboTimeline({bearerToken,fetchImpl=fetch,timeoutMs=6000,now=new Date()}={}) {
  const headers={authorization:`Bearer ${bearerToken}`};
  const user=await getJSON('https://api.x.com/2/users/by/username/thsottiaux',fetchImpl,timeoutMs,headers);
  if(!/^\d+$/.test(user.data?.id))throw new Error('X 用户响应无效');
  const url=new URL(`https://api.x.com/2/users/${user.data.id}/tweets`);
  url.searchParams.set('exclude','retweets');
  url.searchParams.set('max_results','25');
  url.searchParams.set('tweet.fields','created_at,referenced_tweets,author_id');
  url.searchParams.set('expansions','referenced_tweets.id');
  url.searchParams.set('start_time',new Date(now.getTime()-72*HOUR).toISOString());
  const timeline=await getJSON(url,fetchImpl,timeoutMs,headers);
  return (timeline.data??[]).map(post=>{
    const reply=post.referenced_tweets?.find(reference=>reference.type==='replied_to');
    return {...post,source:{url:`https://x.com/thsottiaux/status/${post.id}`},
      activityType:reply ? 'reply' : 'post',
      context:timeline.includes?.tweets?.find(parent=>parent.id===reply?.id)?.text??''};
  });
}

/** Fetch public evidence, never another site's likelihood or credentials. */
export async function collectLiveResetEvidence({ now=new Date(), fallbackArchive, fetchImpl=fetch,
  timeoutMs=6000, llm={}, classifyWithLLM=true, classificationCache=new Map(),
  xBearerToken=process.env.CODEX4EVER_X_BEARER_TOKEN }={}) {
  // One public source (Codex Resets: history and status, including the Tibo
  // posts behind each record); the full timeline only with an X API key.
  const sources=[RESET_HISTORY_URL,RESET_STATUS_URL];
  const fetched=await Promise.allSettled(sources.map(url=>getJSON(url,fetchImpl,timeoutMs)));
  const [history,status]=fetched.map(result=>result.status==='fulfilled' ? result.value : null);
  let directPosts=null,directError=null;
  if(xBearerToken)try {directPosts=await readTiboTimeline({bearerToken:xBearerToken,fetchImpl,timeoutMs,now});}
  catch {directError='X 官方接口不可用，只使用公开 reset 记录';}
  const live=normalizeResetFeed(history,now);
  const records=live.length>=4 ? live : [...(fallbackArchive?.events??[]),...live];
  const latest=normalizeResetFeed({data:status?.data?.latest_reset ? [status.data.latest_reset] : []},now);
  const events=[...new Map([...records,...latest].map(event=>[event.sourceUrl??event.at,event])).values()]
    .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const statusPosts=[status?.data?.scheduled_reset,status?.data?.active_watch].filter(Boolean);
  const candidates=[...(directPosts??[]),...statusPosts,...live.map(event=>({
    text:event.text,createdAt:event.at,source:{url:event.sourceUrl},feedKind:event.kind}))];
  const merged=new Map();
  for(const record of candidates) {
    const post=normalizePost(record,now);
    if(post && record.feedKind)post.signal={kind:record.feedKind==='banked' ? 'banked_credit' : 'reset_completed',
      confidence:1,reason:'公开 reset 记录的类型；不代表个人账户已恢复',
      ...(record.feedKind==='banked' ? {} : {resetTiming:'current',resetOccurredAt:post.createdAt})};
    if(!post)continue;
    const previous=merged.get(post.sourceUrl);
    if(previous?.context && !post.context)post.context=previous.context;
    if(previous?.activityType==='reply')post.activityType='reply';
    merged.set(post.sourceUrl,post);
  }
  const posts=[...merged.values()]
    // Keep reset replies and their parent context even when newer unrelated
    // posts would otherwise fill the eight-post budget and four LLM calls.
    .sort((a,b)=>(campaignDay(b)!==null ? 2 : Number(resetRelated(b)))
      -(campaignDay(a)!==null ? 2 : Number(resetRelated(a)))
      || Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,8);
  const model=classifyWithLLM ? llm.model??process.env.CODEX4EVER_LLM_MODEL : null;
  let classification='explicit-text', classificationError=null,modelCalls=0;
  const classified=[];
  for(const post of posts) {
    if(post.signal) {classified.push(post);continue;}
    const key=[RESET_CLASSIFIER_VERSION,model??'explicit-text',llm.baseUrl??process.env.CODEX4EVER_LLM_BASE_URL,
      post.sourceUrl,post.createdAt,post.text,post.context].join('\0');
    if(classificationCache.has(key)) {
      const cached=classificationCache.get(key);
      if(cached.classifier==='llm')classification='llm';
      classified.push(cached);continue;
    }
    let result;
    if(model && modelCalls<4)try {
      modelCalls++;
      [result]=await classifyTiboPosts([post],{...llm,model,timeoutMs:llm.timeoutMs??12000});
      result.classifier='llm';classification='llm';
    }
    catch {classificationError='部分 LLM 分类不可用，使用明确语句分类';}
    result??=classifyExplicitResetPost(post);
    if(!model || result.classifier==='llm')classificationCache.set(key,result);
    if(classificationCache.size>200)classificationCache.delete(classificationCache.keys().next().value);
    classified.push(result);
  }
  for(const post of classified) {
    const completion=completedResetEvent(post,now.getTime());
    if(completion && !events.some(event=>['automatic','automatic_and_banked'].includes(event.kind)
      && Math.abs(Date.parse(event.at)-Date.parse(completion.at))<HOUR))
      events.push({...completion,kind:'automatic',sourceUrl:post.sourceUrl,text:post.text});
  }
  events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const automatic=events.filter(event=>['automatic','automatic_and_banked'].includes(event.kind));
  const last=automatic.at(-1);
  classified.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const latestResetMention=classified.find(resetRelated)??null;
  const historyLive=live.length>=4;
  const checkedAt=now.toISOString();
  return { retrievedAt:historyLive ? checkedAt.slice(0,10) : fallbackArchive?.retrievedAt,
    checkedAt,events,posts:classified,latestResetMention,campaignTimeZone:'America/Los_Angeles',
    campaigns:[...new Map([...RESET_CAMPAIGNS,...(fallbackArchive?.campaigns??[])]
      .filter(campaign=>Date.parse(campaign.announcedAt)<=now.getTime()).map(campaign=>[campaign.id,campaign])).values()],
    classification,classificationError,llmConfigured:!!model,classificationModel:model??null,
    lastResetAt:last?.at??null,lastResetSource:last?.sourceUrl??null,
    daysSinceReset:last ? (now.getTime()-Date.parse(last.at))/86_400_000 : null,
    coverage:{ history:{status:historyLive ? 'live' : 'cached',url:RESET_HISTORY_URL},
      // Without an X key, replies and posts outside reset records are unavailable.
      social:{status:directPosts ? 'direct' : 'unavailable',
        url:directPosts ? 'https://api.x.com/2/users/:id/tweets' : RESET_STATUS_URL,
        fullTimeline:!!directPosts,upstreamCheckedAt:null,
        reason:directError??(directPosts ? 'X 官方时间线' : '只含公开 reset 记录中的帖子；配置 X key 可读取完整时间线')},
      errors:fetched.flatMap((result,index)=>result.status==='rejected' ? [{url:sources[index],reason:result.reason.message}] : []) } };
}
