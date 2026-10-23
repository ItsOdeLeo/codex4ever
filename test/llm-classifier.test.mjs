import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {classifyTiboPosts} from '../src/llm-classifier.js';
import {completedResetEvent} from '../src/reset-event-time.js';
import {loadLocalLLMEnvironment} from '../src/local-llm-environment.js';

const at='2026-10-19T12:00:00.000Z';
const post=text=>({text,createdAt:at});
async function classify(input,content,finishReason='stop') {
  return (await classifyTiboPosts([input],{model:'test-model',baseUrl:'https://llm.example.test/v1',
    fetchImpl:async(_url,options)=>{
      assert.equal(JSON.parse(options.body).max_completion_tokens,2048);
      return {ok:true,json:async()=>({choices:[{finish_reason:finishReason,message:{content}}]})};
    }}))[0];
}
const json=signal=>JSON.stringify({kind:'unknown',confidence:.9,...signal});

test('分类器接受纯JSON及完整代码块，拒绝前后说明、多对象和被截断的输出',async()=>{
  for(const text of [json({}),`\n\`\`\`json\n${json({})}\n\`\`\`\n`,`\`\`\`\r\n${json({})}\r\n\`\`\``])
    assert.equal((await classify(post('Hello'),text)).signal.kind,'unknown');
  for(const text of [`Here is the result: ${json({})}`,`${json({})}\n${json({})}`,'[]','null',
    `\`\`\`json\n${json({})}\n\`\`\`\nExplanation`])
    await assert.rejects(classify(post('Hello'),text),/有效 JSON/);
  await assert.rejects(classify(post('Hello'),json({}),'length'),/截断/);
});

test('历史回顾即使被模型误报current completed，也不能成为新重置事件',async()=>{
  for(const text of ['We reset Codex limits last week. No new reset is being announced in this post.',
    'We have reset Codex usage last week. No new reset today.',
    'We reset Codex usage last week. We will reset it again today.',
    '昨天 Codex 已重置完成，今天没有新的重置公告。']) {
    const result=await classify(post(text),json({kind:'reset_completed',resetTiming:'current'}));
    assert.equal(result.signal.kind,'unknown');
    assert.equal(result.signal.resetTiming,'historical');
    assert.equal(completedResetEvent(result),null);
    assert.equal(completedResetEvent({...post(text),signal:{kind:'reset_completed',confidence:1}}),null,
      '旧版宿主和回退信号也经过相同防护');
  }
});

test('事件发生时间与发帖时间分开，未明确具体时间时保留公告口径',async()=>{
  const explicit=await classify(post('We reset Codex usage at 2026-10-19T10:00:00Z. The reset is complete.'),
    json({kind:'reset_completed',resetTiming:'current',resetOccurredAt:'2026-10-19T10:00:00Z'}));
  assert.deepEqual(completedResetEvent(explicit),{at:'2026-10-19T10:00:00.000Z',reportedAt:at,timeBasis:'explicit'});
  const current=await classify(post('We have just reset Codex usage. The reset is complete.'),
    json({kind:'reset_completed',resetTiming:'current',resetOccurredAt:null}));
  assert.equal(current.signal.resetOccurredAt,undefined);
  assert.deepEqual(completedResetEvent(current),{at,reportedAt:at,timeBasis:'announcement'});
  const copied=await classify(post('We have just reset Codex usage. The reset is complete.'),
    json({kind:'reset_completed',resetTiming:'current',resetOccurredAt:at}));
  assert.equal(copied.signal.resetOccurredAt,undefined,'模型复制发帖时刻不能伪装成正文明确的发生时刻');
  assert.equal(completedResetEvent(copied).timeBasis,'announcement');
  assert.equal(completedResetEvent({...post('We reset Codex last week, and we have just reset it again today.'),
    signal:{kind:'reset_completed',confidence:1,resetTiming:'current'}}).timeBasis,'announcement');
});

test('未来完成时间、无时区时间和无效时间不能通过分类字段校验',async()=>{
  for(const resetOccurredAt of ['2026-10-19T14:00:00Z','2026-10-19T10:00:00','invalid'])
    await assert.rejects(classify(post('We have reset Codex usage.'),
      json({kind:'reset_completed',resetTiming:'current',resetOccurredAt})),/发生时间无效/);
  await assert.rejects(classify(post('Hello'),json({resetTiming:'made-up'})),/时间类型无效/);
  assert.equal(completedResetEvent({...post('We have reset Codex usage at 2026-10-19T14:00:00Z.'),
    signal:{kind:'reset_completed',confidence:1}}),null,'回退路径也不能用发帖时间替换未来完成时间');
  assert.equal(completedResetEvent({...post('Day 13/ Le limit reset'),
    signal:{kind:'reset_completed',confidence:1,resetTiming:'unknown'}}),null);
  assert.equal(completedResetEvent({...post('We will have reset Codex limits by tonight.'),
    signal:{kind:'reset_completed',confidence:1,resetTiming:'current'}}),null);
});

test('本机配置只加载服务端LLM字段，不覆盖进程设置，不执行文件中的表达式',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'usage-planner-env-'));
  const file=join(dir,'.env.local');
  try {
    await writeFile(file,'CODEX4EVER_LLM_MODEL=claude-haiku-5-5\nCODEX4EVER_LLM_BASE_URL="https://api.anthropic.com/v1"\nCODEX4EVER_LLM_API_KEY=local-test-key\nPATH=do-not-load\nOTHER=$(do-not-execute)\n');
    const env={CODEX4EVER_LLM_MODEL:''};
    await loadLocalLLMEnvironment({file,env});
    assert.equal(env.CODEX4EVER_LLM_MODEL,'');
    assert.equal(env.CODEX4EVER_LLM_BASE_URL,'https://api.anthropic.com/v1');
    assert.equal(env.CODEX4EVER_LLM_API_KEY,'local-test-key');
    assert.equal(env.PATH,undefined);assert.equal(env.OTHER,undefined);
    assert.deepEqual(await loadLocalLLMEnvironment({file:join(dir,'absent'),env:{}}),[]);
  } finally {await rm(dir,{recursive:true,force:true});}
});
