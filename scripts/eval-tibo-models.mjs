import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { classifyTiboPosts } from '../src/llm-classifier.js';

export function scoreTiboCase(item,signal) {
  const expected=item.expected,errors=[];
  if(!signal)return {pass:false,criticalFalseAutomatic:false,errors:['no-valid-result']};
  const criticalFalseAutomatic=!expected.automaticClaimAllowed
    &&['reset_planned','reset_completed'].includes(signal.kind);
  if(!expected.kinds.includes(signal.kind))errors.push('kind');
  if(criticalFalseAutomatic)errors.push('false-automatic-reset');
  if(expected.campaignDay!==undefined&&signal.campaignDay!==expected.campaignDay)errors.push('campaign-day');
  if(expected.validUntil&&Date.parse(signal.validUntil)!==Date.parse(expected.validUntil))errors.push('deadline');
  if(expected.resetTiming!==undefined&&signal.resetTiming!==expected.resetTiming)errors.push('event-timing');
  if(expected.resetOccurredAt!==undefined && (expected.resetOccurredAt===null ? signal.resetOccurredAt!=null
    : Date.parse(signal.resetOccurredAt)!==Date.parse(expected.resetOccurredAt)))errors.push('event-time');
  return {pass:errors.length===0,criticalFalseAutomatic,errors};
}

/** Exercise the existing production prompt/validator. The wrapper only bounds
 * output and records API usage; mocked tests are never reported as model evals.
 */
export async function evaluateTiboModel({model,cases,baseUrl,apiKey,fetchImpl=fetch,
  maxOutputTokens=2048,onProgress=()=>{}}) {
  const results=[];
  for(const item of cases) {
    let usage=null,httpStatus=null,signal=null,error=null;
    const start=performance.now();
    try {
      [signal]=await classifyTiboPosts([item.post],{model,baseUrl,apiKey,timeoutMs:60000,
        fetchImpl:async(url,options)=>{
          const body={...JSON.parse(options.body),max_completion_tokens:maxOutputTokens};
          const response=await fetchImpl(url,{...options,body:JSON.stringify(body)});
          httpStatus=response.status;
          try {usage=(await response.clone().json()).usage??null;}catch {/* Usage may be absent on errors. */}
          return response;
        }});
      signal=signal.signal;
    }catch(caught){error=caught.message;}
    const result={id:item.id,provenance:item.provenance,signal,error,httpStatus,
      latencyMs:Math.round(performance.now()-start),usage,...scoreTiboCase(item,signal)};
    results.push(result);onProgress(result);
    // Stop unsupported/auth/rate-limited models instead of repeating paid calls.
    if([401,403,404,429].includes(httpStatus))break;
  }
  const tokens=key=>results.reduce((total,row)=>total+(row.usage?.[key]??0),0);
  const latencies=results.map(row=>row.latencyMs).sort((a,b)=>a-b);
  return {model,plannedCases:cases.length,attempted:results.length,
    validResults:results.filter(row=>row.signal).length,passed:results.filter(row=>row.pass).length,
    criticalFalseAutomatic:results.filter(row=>row.criticalFalseAutomatic).length,
    inputTokens:tokens('prompt_tokens'),outputTokens:tokens('completion_tokens'),
    cachedInputTokens:results.reduce((total,row)=>total+(row.usage?.prompt_tokens_details?.cached_tokens??0),0),
    usageComplete:results.length>0&&results.every(row=>row.usage),
    medianLatencyMs:latencies[Math.floor(latencies.length/2)]??null,
    p95LatencyMs:latencies[Math.max(0,Math.ceil(latencies.length*.95)-1)]??null,
    results};
}

async function main() {
  const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1];
  if(args.includes('--help')) {
    console.log('node scripts/eval-tibo-models.mjs --models model-a,model-b [--base-url https://.../v1] [--limit 22] [--max-output-tokens 2048]\nCredentials: CODEX4EVER_LLM_API_KEY or OPENAI_API_KEY. Local compatible HTTP APIs may omit a key.\nThis makes paid API requests; output is per post, not per hourly batch.');return;
  }
  const models=(args.includes('--models') ? value('--models') : process.env.CODEX4EVER_LLM_MODEL)?.split(',').filter(Boolean)??[];
  if(!models.length)throw new Error('Specify --models from the configured provider’s available model IDs.');
  const baseUrl=args.includes('--base-url') ? value('--base-url') : process.env.CODEX4EVER_LLM_BASE_URL??'https://api.openai.com/v1';
  const apiKey=process.env.CODEX4EVER_LLM_API_KEY??process.env.OPENAI_API_KEY;
  const url=new URL(baseUrl),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(!apiKey&&!local)throw new Error('No API credential configured; no model calls were made. Set a local environment variable, never commit the key.');
  const dataset=JSON.parse(await readFile(new URL('../experiments/tibo-classifier-eval.json',import.meta.url),'utf8'));
  const limit=args.includes('--limit') ? Number(value('--limit')) : dataset.cases.length;
  const maxOutputTokens=args.includes('--max-output-tokens') ? Number(value('--max-output-tokens')) : 2048;
  if(!Number.isInteger(limit)||limit<1||limit>dataset.cases.length
    ||!Number.isInteger(maxOutputTokens)||maxOutputTokens<256||maxOutputTokens>8192)throw new Error('Invalid evaluation limit/output budget.');
  const cases=dataset.cases.slice(0,limit),reports=[];
  for(const model of models) {
    const report=await evaluateTiboModel({model,cases,baseUrl,apiKey,maxOutputTokens,
      onProgress:row=>console.log(`${model} ${row.id}: ${row.pass ? 'pass' : row.error ? 'API/format error' : row.errors.join(', ')}`)});
    reports.push(report);
  }
  const output={evaluatedAt:new Date().toISOString(),dataset:'experiments/tibo-classifier-eval.json',
    classificationUnit:'one-post-per-request',maxOutputTokens,
    note:'Small, hand-labelled smoke set. Not a statistically calibrated benchmark. No model is auto-selected. Token totals are API-reported; no missing usage is treated as zero cost.',reports};
  await mkdir(new URL('../output/',import.meta.url),{recursive:true});
  await writeFile(new URL('../output/tibo-model-eval.json',import.meta.url),JSON.stringify(output,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(reports.map(({results,...summary})=>summary),null,2));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(await realpath(process.argv[1])).href)
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
