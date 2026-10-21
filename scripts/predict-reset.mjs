import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { collectLiveResetEvidence } from '../src/live-reset-evidence.js';
import { loadLocalLLMEnvironment } from '../src/local-llm-environment.js';
import { predictionFromArchive } from '../src/reset-forecast.js';

await loadLocalLLMEnvironment();

const args=process.argv.slice(2);
const value=name=>args[args.indexOf(name)+1];
if(args.some((arg,index)=>!['--live','--json','--input','--now','--time-zone'].includes(arg)
  && !['--input','--now','--time-zone'].includes(args[index-1])))throw new Error('参数：--live / --input 文件 / --now ISO时间 / --time-zone IANA时区 / --json');
for(const flag of ['--input','--now','--time-zone'])if(args.includes(flag) && (!value(flag) || value(flag).startsWith('--')))
  throw new Error(`${flag}需要参数`);
const now=args.includes('--now') ? new Date(value('--now')) : new Date();
const timeZone=args.includes('--time-zone') ? value('--time-zone') : Intl.DateTimeFormat().resolvedOptions().timeZone;
new Intl.DateTimeFormat('en-CA',{timeZone}).format(now);
let archive;
if(args.includes('--input'))archive=JSON.parse(await readFile(value('--input'),'utf8'));
else {
  try {archive=JSON.parse(await readFile(new URL('../output/live-reset-evidence.json',import.meta.url),'utf8'));}
  catch {archive=JSON.parse(await readFile(new URL('../experiments/public-reset-events.json',import.meta.url),'utf8'));}
}
if(args.includes('--live'))archive=await collectLiveResetEvidence({now,fallbackArchive:archive});
const result=predictionFromArchive({archive,now,timeZone});
if(!result.available)throw new Error(result.reason);
const p=result.prediction,model=p.evidence.intervalModel;
const format=stamp=>stamp ? new Intl.DateTimeFormat('zh-CN',{timeZone,month:'numeric',day:'numeric',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(stamp)) : '范围超出一年';
const round=n=>n===null ? '数据不足' : Number(n.toFixed(2));
const summary={截至:format(now),上次公开重置:format(result.lastResetAt),
  当前活动:p.evidence.campaign??null,
  当前平均间隔天:round(model.meanIntervalDays),间隔统计依据:model.source,
  完整间隔样本:model.sampleCount,
  发布钟点统计:p.releaseClock ? {范围:p.releaseClock.sampleScope,样本:p.releaseClock.sampleCount,
    常见钟点:p.releaseClock.typicalTime,时区:p.releaseClock.timeZone} : null,
  均值95区间天:model.meanIntervalConfidence ? [round(model.meanIntervalConfidence.lowDays),round(model.meanIntervalConfidence.highDays)] : null,
  活动日时区:p.timeZone,当前活动日余下概率:`${round(p.todayProbability*100)}%`,
  未来48小时概率:`${round(p.next48Probability*100)}%`,
  最可能重置窗口:p.resetTimeMode ? [format(p.resetTimeMode.from),format(p.resetTimeMode.to)] : null,
  该小时概率:p.resetTimeMode ? `${round(p.resetTimeMode.probability*100)}%` : null,
  下一次重置80预测窗口:[format(p.nextResetWindow.from),format(p.nextResetWindow.to)],
  硬规则:p.evidence.hardRules.map(rule=>({规则:rule.kind,截至:format(rule.until),Day:rule.day})),
  旧历史平均天:round(model.historicalMeanIntervalDays),数据状态:archive.coverage??'离线档案',未校准:!p.calibrated};
await mkdir(new URL('../output/',import.meta.url),{recursive:true});
await writeFile(new URL('../output/reset-prediction.json',import.meta.url),JSON.stringify({summary,...result},null,2));
console.log(JSON.stringify(args.includes('--json') ? {summary,...result} : summary,null,2));
