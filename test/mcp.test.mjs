import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function startMcp(env = {}, source = null) {
  const child = spawn(process.execPath, source ? ['--input-type=module','-e',source] : ['src/mcp-server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    // Never touch the user's real reminder settings from a test run.
    env: { ...process.env, USAGE_PLANNER_HOME: join(tmpdir(), `usage-planner-home-test-${process.pid}-${Math.random()}`),
      USAGE_PLANNER_ALERT_FILE: join(tmpdir(), `usage-planner-alerts-test-${process.pid}-${Math.random()}.json`), ...env }, stdio: ['pipe', 'pipe', 'pipe']
  });
  const pending = new Map();
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  createInterface({ input: child.stdout }).on('line', line => {
    let message;
    try { message = JSON.parse(line); }
    catch { for (const item of pending.values()) item.reject(new Error(`非 JSON-RPC 输出：${line}`)); return; }
    if (message.id !== undefined && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      item.resolve(message);
    }
  });
  child.on('exit', code => {
    for (const item of pending.values()) item.reject(new Error(`MCP 退出 ${code}：${stderr}`));
    pending.clear();
  });
  let id = 0;
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`${method} 超时：${stderr}`)); }, 15_000);
    pending.set(next, {
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); }
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: next, method, params })}\n`);
  });
  const notify = (method, params = {}) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  const close = async () => {
    child.stdin.end();
    if (child.exitCode === null) await once(child, 'exit');
  };
  return { request, notify, close };
}

async function initialize(client) {
  const init = await client.request('initialize', {
    protocolVersion: '2025-06-18', capabilities: {},
    clientInfo: { name: 'usage-planner-test', version: '1.0.0' }
  });
  assert.equal(init.result.serverInfo.name, 'usage-planner');
  client.notify('notifications/initialized');
}

test('Keep available MCP接口输出同源预算和可开关的检查提醒，额外 reset 参与乐观策略',async()=>{
  const now='2026-10-18T12:00:00Z';
  const source=`import {serveStdio} from '@modelcontextprotocol/server/stdio';
    import {createUsagePlannerServer} from './src/mcp-server.js';
    serveStdio(()=>createUsagePlannerServer({clock:()=>new Date(${JSON.stringify(now)})}));`;
  const client=startMcp({USAGE_PLANNER_LLM_MODEL:''},source);
  try {
    await initialize(client);
    const call=async extra=>(await client.request('tools/call',{name:'plan_usage_strategy',arguments:{
      input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},now,timeZone:'UTC',
      usageStrategy:'keep-available',availabilityMode:'cautious',averagePercentPerDay:20,
      includeDetails:false,...extra}})).result;
    const on=await call({alertsEnabled:true});
    assert.equal(on.isError,undefined,on.content?.[0]?.text);
    const a=on.structuredContent.actionPlan;
    assert.equal(a.availability.goal,'keep-available');
    assert.equal(a.recommendation.dailyPercent,8.75);
    assert.equal(a.availability.notification.shouldNotify,true);
    assert.equal(a.availability.notification.trigger,'on-plan-check');
    assert.match(on.content[0].text,/Pace alert/);
    const off=await call({alertsEnabled:false});
    assert.equal(off.structuredContent.actionPlan.availability.notification.shouldNotify,false);
    assert.deepEqual(off.structuredContent.actionPlan.stages,a.stages);
    assert.doesNotMatch(off.content[0].text,/Pace alert/);
    const evidence={now,timeZone:'UTC',resetTimes:[1,4,7,10,13,16].map(day=>`2026-10-${String(day).padStart(2,'0')}T02:00:00Z`),
      posts:[{createdAt:'2026-10-18T11:00:00Z',sourceUrl:'https://x.com/thsottiaux/status/777',
        text:'We will reset Codex limits later today.',signal:{kind:'reset_planned',confidence:.99,validUntil:'2026-10-19T07:00:00Z'}}]};
    const optimistic=await call({availabilityMode:'optimistic',evidence});
    assert.equal(optimistic.isError,undefined,optimistic.content?.[0]?.text);
    const b=optimistic.structuredContent.actionPlan;
    assert.equal(b.availability.forecastUsed,true);
    assert.ok(b.recommendation.dailyPercent>a.recommendation.dailyPercent);
    assert.ok(b.availability.ifNoReset.dailyPercent>0);
    // Optimistic keep available counts the predicted resets, as other strategies do.
    assert.equal(b.basis,'conditional-forecast-preview');
    assert.equal(b.contingency.selected.bankUses.length,0);
  }finally {await client.close();}
});

test('MCP 可显式采用配置模型，事件发生时间穿过工具schema进入同一预测器',async()=>{
  const now='2026-10-19T12:00:00Z';
  const post={createdAt:'2026-10-18T02:00:00Z',text:'We reset Codex usage at 2026-10-17T02:00:00Z. The reset is complete.',
    sourceUrl:'https://x.com/thsottiaux/status/777',
    signal:{kind:'reset_completed',confidence:.95,resetTiming:'current',resetOccurredAt:'2026-10-17T02:00:00Z'}};
  const archive={retrievedAt:'2026-10-19',checkedAt:now,posts:[post],
    events:[1,5,9,13,17].map(day=>({kind:'automatic',at:`2026-10-${String(day).padStart(2,'0')}T02:00:00Z`}))};
  const source=`import {serveStdio} from '@modelcontextprotocol/server/stdio';
    import {createUsagePlannerServer} from './src/mcp-server.js';
    serveStdio(()=>createUsagePlannerServer({collectEvidence:async({classifyWithLLM})=>({...${JSON.stringify(archive)},
      classification:classifyWithLLM?'llm':'explicit-text',classificationModel:classifyWithLLM?'claude-haiku-5-5':null})}));`;
  const client=startMcp({USAGE_PLANNER_LLM_MODEL:''},source);
  try {
    await initialize(client);
    const call=async(name,args)=>(await client.request('tools/call',{name,arguments:args})).result;
    const raw=await call('get_reset_evidence',{now,timeZone:'UTC'});
    assert.equal(raw.structuredContent.analysis.by,'mcp-host');
    assert.equal(raw.structuredContent.evidence.posts[0].signal,undefined);
    const classified=await call('get_reset_evidence',{now,timeZone:'UTC',classifyPosts:true});
    assert.equal(classified.structuredContent.analysis.by,'configured-llm');
    assert.equal(classified.structuredContent.analysis.model,'claude-haiku-5-5');
    const predicted=await call('predict_reset',{evidence:classified.structuredContent.evidence});
    assert.equal(predicted.isError,undefined,predicted.content?.[0]?.text);
    assert.equal(predicted.structuredContent.classifiedSignals[0].signal.resetOccurredAt,post.signal.resetOccurredAt);
  }finally {await client.close();}
});

test('MCP 直接打开完整前端，按需刷新沿用已分析证据，新帖子不冒充已分析',async()=>{
  const now='2026-10-19T00:00:00.000Z';
  const posts=[{createdAt:'2026-10-18T23:00:00.000Z',text:'We will reset later today.',
    activityType:'reply',context:'Will there be a Codex reset?',sourceUrl:'https://x.com/thsottiaux/status/12345'}];
  const archive={retrievedAt:'2026-10-19',checkedAt:now,posts,
    events:[1,5,9,13,17].map(day=>({kind:'automatic',at:`2026-10-${String(day).padStart(2,'0')}T02:00:00.000Z`})),
    coverage:{history:{status:'live'},social:{status:'direct'}}};
  const raw={ordinaryUsageAllowed:true,rateLimitsByLimitId:{codex:{primary:{usedPercent:41,
    windowDurationMins:10080,resetsAt:Date.parse('2026-10-24T20:00:00Z')/1000},secondary:null}},
    rateLimitResetCredits:{availableCount:0,credits:[]}};
  const source=`import {serveStdio} from '@modelcontextprotocol/server/stdio';
    import {createUsagePlannerServer} from './src/mcp-server.js';
    import {startPlannerPage} from './src/local-planner-page.js';
    const page=await startPlannerPage({root:new URL(${JSON.stringify(new URL('../plugins/usage-planner/web/',import.meta.url).href)})});
    process.stdin.once('end',()=>page.close());let reads=0,collects=0;
    serveStdio(()=>createUsagePlannerServer({plannerPage:page,clock:()=>new Date(${JSON.stringify(now)}),
      readUsage:async()=>{reads++;return ${JSON.stringify(raw)};},
      collectEvidence:async()=>{collects++;return {...${JSON.stringify(archive)},posts:collects>2
        ? [{...${JSON.stringify(posts[0])},text:'A different, unclassified reply.'}] : ${JSON.stringify(posts)}};} }));`;
  const client=startMcp({USAGE_PLANNER_LLM_MODEL:''},source);
  try {
    await initialize(client);
    const opened=await client.request('tools/call',{name:'open_planner',arguments:{timeZone:'UTC',language:'en'}});
    assert.equal(opened.result.isError,undefined,opened.result.content?.[0]?.text);
    const url=new URL(opened.result.structuredContent.url);
    const headers={Authorization:`Bearer ${new URLSearchParams(url.hash.slice(1)).get('planner')}`};
    const get=async()=>await (await fetch(new URL('/api/session',url),{headers})).json();
    const first=await get();
    assert.equal(first.session.usageSnapshot.weekly.remainingPercent,59);
    assert.equal(first.session.result.strategy.conditional,true,'插件页面与网页同一规则：计入较有把握的 reset');
    assert.equal(first.session.forecastSource.latestPost.text,posts[0].text);
    const signal={kind:'reset_planned',confidence:.99,reason:'Synthetic host analysis',validUntil:'2026-10-19T20:00:00Z'};
    await client.request('tools/call',{name:'plan_usage_strategy',arguments:{usageSnapshot:first.session.usageSnapshot,
      evidence:{...first.session.evidence,posts:[{...posts[0],signal}]},includeDetails:false}});
    const refresh=async()=>{
      const response=await fetch(new URL('/api/refresh',url),{method:'POST',headers});
      assert.equal(response.status,200,await response.clone().text());return response.json();
    };
    const same=await refresh();
    assert.deepEqual(same.session.evidence.posts[0].signal,signal);
    const changed=await refresh();
    assert.equal(changed.session.evidence.posts[0].signal,undefined,'正文变了就不能沿用旧分类');
    assert.equal(changed.session.forecastSource.latestPost.text,'A different, unclassified reply.');
    assert.equal(changed.session.forecastSource.latestPost.signal,undefined);
    const chosen=await (await fetch(new URL('/api/refresh',url),{method:'POST',
      headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({usageStrategy:'weekdays',paceMultiplier:1.5,forecastEnabled:false,language:'zh-CN'})})).json();
    assert.equal(chosen.session.planning.usageStrategy,'weekdays');
    assert.equal(chosen.session.planning.paceMultiplier,1.5);
    assert.equal(chosen.session.prediction,null,'关闭预测后刷新不能擅自打开');
    assert.equal(chosen.session.language,'zh-CN');
  }finally {await client.close();}
});

test('MCP stdio 列出工具并返回可执行策略与错误', async () => {
  const client = startMcp();
  try {
    await initialize(client);
    const listed = await client.request('tools/list');
    assert.deepEqual(listed.result.tools.map(tool => tool.name).sort(),
      ['get_reset_evidence', 'get_usage_snapshot', 'open_planner', 'plan_usage_strategy', 'predict_reset', 'usage_alerts']);
    const result = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: {
      now: '2026-10-13T12:00:00Z', timeZone: 'UTC',
      input: { weeklyRemaining: 10, weeklyResetDays: 6, weeklyResetHours: 0, resetDates: [], credits: 0 } } });
    assert.equal(result.result.isError, undefined, result.result.content?.[0]?.text);
    const plan = result.result.structuredContent;
    assert.equal(plan.strategy.method, 'scenario-based-rolling-policy-search', '手动输入也只用同一种算法');
    assert.equal(plan.actionPlan.recommendation.dailyPercent, plan.recommendation.firstAction.dailyPercent);
    assert.ok(plan.milestones.points.some(point => point.reasons.includes('depletion')));
    const removed = await client.request('tools/call', { name: 'recommend_usage', arguments: {} });
    assert.ok(removed.error || removed.result.isError, '旧版求解器工具已移除');
    const invalid = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: {} });
    assert.equal(invalid.result.isError, true);
    assert.match(invalid.result.content[0].text, /恰好提供/);
  } finally { await client.close(); }
});

test('MCP宿主取原帖、自己分类、回传规划，无额外模型API并保留父帖与取证时钟',async()=>{
  const now='2026-10-16T08:00:00.000Z';
  const reply={createdAt:'2026-10-16T07:00:00.000Z',text:'Yes, later today.',activityType:'reply',
    context:'Will Codex usage limits reset later today?',sourceUrl:'https://x.com/thsottiaux/status/999',
    signal:{kind:'unknown',confidence:0}};
  const archive={retrievedAt:'2026-10-16',checkedAt:now,posts:[reply],
    events:['2026-10-01','2026-10-05','2026-10-10','2026-10-14'].map(day=>({at:`${day}T08:00:00.000Z`,kind:'automatic'}))
      .concat({at:'2026-10-15T08:00:00.000Z',kind:'banked'}),
    lastResetAt:'2026-10-14T08:00:00.000Z',lastResetSource:'https://x.com/thsottiaux/status/998',
    coverage:{history:{status:'live'},social:{status:'partial'}}};
  const source=`import {serveStdio} from '@modelcontextprotocol/server/stdio';
    import {createUsagePlannerServer} from './src/mcp-server.js';
    serveStdio(()=>createUsagePlannerServer({collectEvidence:async options=>{
      if(options.classifyWithLLM!==false)throw new Error('宿主模式不能另调LLM API');
      return ${JSON.stringify(archive)};
    }}));`;
  const client=startMcp({USAGE_PLANNER_LLM_MODEL:''},source);
  try {
    await initialize(client);
    const raw=await client.request('tools/call',{name:'get_reset_evidence',arguments:{now,timeZone:'UTC'}});
    assert.equal(raw.result.isError,undefined,raw.result.content?.[0]?.text);
    const data=raw.result.structuredContent;
    assert.equal(data.analysis.by,'mcp-host');
    assert.equal(data.analysis.classifyPosts,false);
    assert.equal(data.forecastAvailable,true);
    assert.equal(data.evidence.resetTimes.length,4,'纯备用发放不加入自动重置历史');
    assert.equal(data.evidence.campaign.id,'codex-28-days-2026-10');
    assert.equal(data.evidence.campaign.endsAt,'2026-11-02T08:00:00.000Z');
    assert.equal(data.evidence.posts[0].signal,undefined,'由当前宿主判断，不预填规则分类');
    assert.equal(data.evidence.posts[0].context,reply.context);
    assert.equal(data.evidence.sourceStatus.social,archive.coverage.social.status);
    assert.equal(data.evidence.posts[0].sourceUrl,reply.sourceUrl);
    const args={input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
      classifyPosts:false,evidence:{...data.evidence,posts:[]}};
    const history=await client.request('tools/call',{name:'plan_usage_strategy',arguments:args});
    const planned=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,
      evidence:{...data.evidence,posts:[{...data.evidence.posts[0],signal:{kind:'reset_planned',confidence:.95,
        validUntil:'2026-10-16T22:00:00.000Z',reason:'合成测试：宿主识别已宣布'}}]}}});
    assert.equal(history.result.isError,undefined,history.result.content?.[0]?.text);
    assert.equal(planned.result.isError,undefined,planned.result.content?.[0]?.text);
    const before=history.result.structuredContent,after=planned.result.structuredContent;
    assert.equal(after.resetPrediction.prediction.evidence.intervalModel.source,'campaign-intervals');
    assert.equal(after.resetPrediction.prediction.evidence.intervalModel.sampleCount,2);
    assert.equal(after.resetPrediction.prediction.releaseClock.sampleScope,'all-history');
    assert.equal(after.now,now,'第二次调用默认沿用证据时间，不因模型分析耗时改变基线');
    assert.equal(after.timeZone,'UTC','第二次调用默认沿用取证时区');
    assert.ok(after.resetPrediction.prediction.next48Probability>before.resetPrediction.prediction.next48Probability);
    const signal=after.resetPrediction.classifiedSignals[0];
    assert.equal(signal.context,reply.context);
    assert.equal(signal.activityType,'reply');
    assert.equal(signal.sourceUrl,reply.sourceUrl);
    assert.equal(after.phasePlans[0].dailyPercent,20,'宿主判断不改变用量目标');
    assert.equal(after.milestones.points.find(point=>point.reasons.includes('depletion')).hours,48);
    assert.ok(after.resetForecast.milestones.find(point=>point.kind==='depletion').probability>
      before.resetForecast.milestones.find(point=>point.kind==='depletion').probability);
  }finally{await client.close();}
});

test('新版 MCP 返回预测与备用策略，Credits 仅按意愿提供不估价的衔接选项', async () => {
  const client = startMcp();
  try {
    await initialize(client);
    const args = { now: '2026-10-14T12:00:00Z', timeZone: 'UTC', input: {
      weeklyRemaining: 0, weeklyResetDays: 5, weeklyResetHours: 0,
      resetDates: ['2026-11-10'], credits: 50, allowCredits: true }, evidence: {
      priorDailyProbability: 0.1, posts: [{ text: 'Reset by 14:00 UTC',
        createdAt: '2026-10-14T12:00:00Z', signal: { kind: 'reset_planned',
          confidence: 1, validUntil: '2026-10-14T14:00:00Z' } }] } };
    const response = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: args });
    assert.equal(response.result.isError, undefined, response.result.content?.[0]?.text);
    const result = response.result.structuredContent;
    assert.equal(result.strategy.method, 'scenario-based-rolling-policy-search');
    assert.equal(result.selectedOptionId, result.options[0].id);
    assert.equal(result.credits.allowed, true);
    assert.equal(result.credits.balance, 50);
    assert.equal(result.credits.included, false, 'Credits 不计入额度或估价');
    assert.equal(result.creditsCostSource, 'not-estimated');
    assert.equal(result.resetForecast.enabled, true);
    assert.ok(result.resetPrediction.prediction.todayProbability > 0.1);
    const args2 = { now: args.now, input: { weeklyRemaining: 40, weeklyResetDays: 4,
      weeklyResetHours: 0, credits: 0, resetDates: ['2026-10-14'] } };
    const first = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: args2 });
    assert.equal(first.result.isError, undefined, first.result.content?.[0]?.text);
    const expiring = first.result.structuredContent.backupChoices[0];
    assert.equal(expiring.used, true, '当天到期的备用在到期前用掉');
    assert.ok(Date.parse(expiring.at) < Date.parse(first.result.structuredContent.resets[0].expiresAt));
  } finally { await client.close(); }
});

test('MCP交互强度路径与页面共享新周期算法，保留备用恢复原刷新日期', async () => {
  const client=startMcp();
  try {
    await initialize(client);
    const args={now:'2026-10-15T08:00:00Z',timeZone:'Europe/Berlin',paceMultiplier:1.1,
      input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,credits:0,resetDates:['2026-10-17']}};
    const used=await client.request('tools/call',{name:'plan_usage_strategy',arguments:args});
    assert.equal(used.result.isError,undefined,used.result.content?.[0]?.text);
    const result=used.result.structuredContent;
    assert.equal(result.paceMultiplier,1.1);
    assert.equal(result.normalResetSource,'estimated-restarted-week');
    assert.notEqual(result.normalResetAt,result.originalNormalResetAt);
    const held=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,heldResetIndices:[0]}});
    assert.equal(held.result.isError,undefined);
    assert.equal(held.result.structuredContent.normalResetAt,result.originalNormalResetAt);
    const doubled=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,
      paceMultiplier:2,heldResetIndices:[0]}});
    assert.equal(doubled.result.isError,undefined,doubled.result.content?.[0]?.text);
    assert.equal(doubled.result.structuredContent.startingPoint.dailyPercent,40);
    const phase=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,
      heldResetIndices:[0],paceMultiplier:1.5}});
    assert.equal(phase.result.isError,undefined,phase.result.content?.[0]?.text);
    assert.equal(phase.result.structuredContent.phasePlans[0].dailyPercent,30);
  } finally {await client.close();}
});

test('MCP联合规划接受备用约束，并联动第二张备用的决策位置',async()=>{
  const client=startMcp();
  try{
    await initialize(client);
    const args={now:'2026-10-15T18:55:00Z',timeZone:'Europe/Berlin',requiredResetIndices:[0],heldResetIndices:[1],
      input:{weeklyRemaining:38,weeklyResetDays:4,weeklyResetHours:0,credits:0,resetDates:['2026-10-16','2026-10-23']}};
    const response=await client.request('tools/call',{name:'plan_usage_strategy',arguments:args});
    assert.equal(response.result.isError,undefined,response.result.content?.[0]?.text);
    const result=response.result.structuredContent;
    assert.equal(result.adaptivePace,true);
    assert.equal(result.backupChoices[0].used,true,'必须使用的备用按约束使用');
    assert.ok(Date.parse(result.backupChoices[0].at)<Date.parse(result.resets[0].expiresAt));
    assert.equal(result.backupChoices[1].used,false,'保留的备用不使用');
    assert.match(result.backupChoices[1].at,/2026-10-21/);
    const predicted=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{
      now:'2026-10-15T08:00:00Z',timeZone:'Europe/Berlin',usageStrategy:'maximize',
      input:{weeklyRemaining:25,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
      evidence:{priorDailyProbability:.98}}});
    assert.equal(predicted.result.isError,undefined,predicted.result.content?.[0]?.text);
    const forecast=predicted.result.structuredContent;
    assert.equal(forecast.strategy.conditional,true,'高概率 reset 计入计划');
    assert.ok(forecast.phasePlans[0].dailyPercent>forecast.startingPoint.dailyPercent,'预计补满前可多用');
    assert.equal(forecast.resetForecast.enabled,true);
    assert.equal(forecast.credits.bridge,null);
  }finally{await client.close();}
});

test('MCP截图回归：默认沿用当前用量，备用补满和预测都不能重新减量', async () => {
  const client = startMcp();
  try {
    await initialize(client);
    const args = { now: '2026-10-16T07:46:00Z', timeZone: 'Europe/Berlin',
      requiredResetIndices: [0], heldResetIndices: [1],
      input: { weeklyRemaining: 40, weeklyResetDays: 6, weeklyResetHours: 10,
        resetDates: ['2026-10-16', '2026-10-23'] } };
    for (const forecast of [false, true]) {
      const response = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: {
        ...args, ...(forecast ? { evidence: { priorDailyProbability: .3 } } : {}) } });
      assert.equal(response.result.isError, undefined, response.result.content?.[0]?.text);
      const result = response.result.structuredContent;
      assert.ok(result.phasePlans.every(phase => phase.multiplier === 1 || phase.dailyPercent === 0),
        '只按当前用量或等待，不暗中减量');
      if (!forecast) assert.equal(result.milestones.points.filter(point => point.reasons.includes('depletion')).at(-1).at,
        '2026-10-17T16:26:00.000Z');
      assert.ok(result.milestones.segments.some(segment => segment.dailyPercent === 0));
    }
    const response = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: {
      ...args, paceMultiplier: 1.2 } });
    assert.equal(response.result.isError, undefined, response.result.content?.[0]?.text);
    assert.ok(response.result.structuredContent.phasePlans.every(phase => phase.multiplier === 1.2 || phase.dailyPercent === 0));
  } finally { await client.close(); }
});

test('MCP默认采用运行环境时区，证据时区和显式用户时区按优先级覆盖', async () => {
  const now = '2026-10-16T08:00:00.000Z';
  const archive = { retrievedAt: '2026-10-16', campaignTimeZone: 'America/Los_Angeles', posts: [],
    events: [6, 9, 12, 15].map(day => ({ kind: 'automatic', at: `2026-10-${String(day).padStart(2, '0')}T05:00:00Z` })) };
  const client = startMcp({ TZ: 'Asia/Tokyo' }, `import {serveStdio} from '@modelcontextprotocol/server/stdio';
    import {createUsagePlannerServer} from './src/mcp-server.js';
    serveStdio(()=>createUsagePlannerServer({collectEvidence:async()=>(${JSON.stringify(archive)})}));`);
  try {
    await initialize(client);
    const raw = await client.request('tools/call', { name: 'get_reset_evidence', arguments: { now } });
    assert.equal(raw.result.isError, undefined, raw.result.content?.[0]?.text);
    assert.equal(raw.result.structuredContent.evidence.timeZone, 'Asia/Tokyo');
    const args = { now, input: { weeklyRemaining: 40, weeklyResetDays: 4,
      weeklyResetHours: 0, resetDates: [] } };
    for (const [extra, expected] of [[{}, 'Asia/Tokyo'],
      [{ evidence: { ...raw.result.structuredContent.evidence, timeZone: 'America/New_York' } }, 'America/New_York'],
      [{ evidence: { ...raw.result.structuredContent.evidence, timeZone: 'America/New_York' }, timeZone: 'Asia/Shanghai' }, 'Asia/Shanghai']]) {
      const response = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: { ...args, ...extra } });
      assert.equal(response.result.isError, undefined, response.result.content?.[0]?.text);
      assert.equal(response.result.structuredContent.timeZone, expected);
      if (response.result.structuredContent.resetPrediction) {
        assert.equal(response.result.structuredContent.resetPrediction.prediction.displayTimeZone, expected);
        assert.equal(response.result.structuredContent.resetPrediction.prediction.timeZone, 'America/Los_Angeles');
      }
    }
  } finally { await client.close(); }
});

test('MCP 默认与网页同一规则：按置信度计入 reset；显式 feedback 仅供比较',async()=>{
  const client=startMcp();
  try {
    await initialize(client);
    const args={now:'2026-10-18T12:00:00Z',timeZone:'UTC',averagePercentPerDay:100,
      input:{weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']},
      evidence:{now:'2026-10-18T12:00:00Z',timeZone:'UTC',
        resetTimes:[3,7,11,15,17].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)}};
    const response=await client.request('tools/call',{name:'plan_usage_strategy',arguments:args});
    assert.equal(response.result.isError,undefined,response.result.content?.[0]?.text);
    const plan=response.result.structuredContent;
    // Same default as the website: likely resets are counted at conservative times.
    assert.equal(plan.strategy.method,'scenario-based-rolling-policy-search');
    assert.equal(plan.recommendation.forecastIncluded,true);
    assert.equal(plan.strategy.conditional,true);
    assert.equal(plan.actionPlan.basis,'conditional-forecast-preview');
    assert.ok(plan.milestones.points.flatMap(point=>point.events).some(event=>event.kind==='assumed-extra-reset'));
    assert.equal(plan.actionPlan.recommendation.dailyPercent,plan.recommendation.firstAction.dailyPercent);
    assert.ok(plan.actionPlan.recommendation.reviewAt);
    assert.match(response.result.content[0].text,/counts likely extra resets/);
    assert.equal(plan.recommendation.fallback.publicCount,0,'未发生时的安排不补入假额度');
    const explicit=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,
      recommendationMode:'forecast-preview',language:'zh-CN'}});
    assert.equal(explicit.result.isError,undefined,explicit.result.content?.[0]?.text);
    assert.deepEqual(explicit.result.structuredContent.actionPlan.recommendation,plan.actionPlan.recommendation,
      'MCP 默认与网页规则完全相同');
    assert.match(explicit.result.content[0].text,/较有把握的额外 reset/);
    const robust=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,recommendationMode:'feedback'}});
    assert.equal(robust.result.structuredContent.strategy.conditional,false,'显式要求时仍可比较不计入 reset 的稳健方案');
    const compact=await client.request('tools/call',{name:'plan_usage_strategy',arguments:{...args,
      language:'zh-CN',includeDetails:false}});
    assert.equal(compact.result.isError,undefined,compact.result.content?.[0]?.text);
    assert.deepEqual(Object.keys(compact.result.structuredContent).sort(),['actionPlan','available']);
    assert.equal(compact.result.structuredContent.actionPlan.recommendation.dailyPercent,
      plan.actionPlan.recommendation.dailyPercent);
    assert.match(compact.result.content[0].text,/建议日均|当前等待|当前休息/);
  }finally {await client.close();}
});

test('单次 MCP 调用读取 Codex 快照并计算策略', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'usage-planner-mock-'));
  const executable = join(dir, 'codex-mock.mjs');
  const resetAt = Math.floor(Date.now() / 1000) + 6 * 24 * 3600;
  const expiry = Math.floor(Date.now() / 1000) + 10 * 24 * 3600;
  const snapshot = { ordinaryUsageAllowed: true, rateLimitsByLimitId: { codex: {
    planType: 'pro', primary: { usedPercent: 28, windowDurationMins: 10080, resetsAt: resetAt },
    secondary: null, credits: { hasCredits: true, unlimited: false, balance: '123.5' }
  } }, rateLimitResetCredits: { availableCount: 1, credits: [
    { id: 'private-id', resetType: 'codexRateLimits', status: 'available', expiresAt: expiry }
  ] } };
  const script = `#!${process.execPath}\nimport { createInterface } from 'node:readline';\n` +
    `createInterface({ input: process.stdin }).on('line', line => {\n` +
    `  const request = JSON.parse(line);\n` +
    `  if (request.id === 1) process.stdout.write(JSON.stringify({id:1,result:{}}) + '\\n');\n` +
    `  if (request.id === 2) process.stdout.write(JSON.stringify({id:2,result:${JSON.stringify(snapshot)}}) + '\\n');\n` +
    `});\n`;
  await writeFile(executable, script);
  await chmod(executable, 0o755);
  const client = startMcp({ USAGE_PLANNER_CODEX_CLI: executable });
  try {
    await initialize(client);
    const read = await client.request('tools/call', { name: 'get_usage_snapshot', arguments: { timeZone: 'UTC' } });
    assert.equal(read.result.isError, undefined, read.result.content?.[0]?.text);
    const { usageSnapshot, pace } = read.result.structuredContent;
    assert.equal(usageSnapshot.weekly.remainingPercent, 72);
    assert.equal(usageSnapshot.bankedResetCount, 1);
    assert.equal(JSON.stringify(read.result.structuredContent).includes('private-id'), false);
    assert.ok(pace.averagePercentPerDay > 0);
    const planned = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: { usageSnapshot } });
    assert.equal(planned.result.isError, undefined, planned.result.content?.[0]?.text);
    const output = planned.result.structuredContent;
    assert.equal(output.strategy.method, 'scenario-based-rolling-policy-search');
    assert.equal(output.resourceSource, 'codex-app-server');
    assert.equal(output.actionPlan.recommendation.dailyPercent, output.recommendation.firstAction.dailyPercent);
    assert.equal(output.resetForecast.enabled, false);
    const predicted = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: {
      usageSnapshot, evidence: { timeZone: 'UTC', priorDailyProbability: 0.15,
        posts: [{ createdAt: new Date(Date.now() - 3_600_000).toISOString(),
          text: 'A possible upcoming quota reset', signal: { kind: 'reset_hint', confidence: 0.9 } }] }
    } });
    assert.equal(predicted.result.isError, undefined, predicted.result.content?.[0]?.text);
    assert.equal(predicted.result.structuredContent.resetForecast.enabled, true);
    assert.ok(predicted.result.structuredContent.resetPrediction.prediction.next48Probability > 0);
  } finally { await client.close(); await rm(dir, { recursive: true, force: true }); }
});

test('MCP 把帖子预测接进策略情景，并在未配置模型时明确报错', async () => {
  const client = startMcp({ USAGE_PLANNER_LLM_MODEL: '' });
  try {
    await initialize(client);
    const result = await client.request('tools/call', { name: 'plan_usage_strategy', arguments: {
      now: '2026-10-13T12:00:00Z', timeZone: 'UTC', input: {
        weeklyRemaining: 10, weeklyResetDays: 6, weeklyResetHours: 0, resetDates: [], credits: 0
      }, evidence: { now: '2026-10-13T12:00:00Z', timeZone: 'UTC',
        priorDailyProbability: 0.1, posts: [{ createdAt: '2026-10-13T11:00:00Z',
          text: 'Today we plan a Codex quota reset.',
          signal: { kind: 'reset_planned', confidence: 0.95,
            validUntil: '2026-10-14T00:00:00Z' } }] }
    } });
    assert.equal(result.result.isError, undefined, result.result.content?.[0]?.text);
    const output = result.result.structuredContent;
    assert.equal(output.resetPrediction.classifiedSignals[0].signal.kind, 'reset_planned');
    assert.ok(output.resetPrediction.prediction.todayProbability > 0.1);
    assert.equal(output.resetForecast.enabled, true);
    const noModel = await client.request('tools/call', { name: 'predict_reset', arguments: {
      classifyPosts: true, evidence: { now: '2026-10-13T12:00:00Z', timeZone: 'UTC',
        priorDailyProbability: 0.1, posts: [{ createdAt: '2026-10-13T11:00:00Z',
          text: 'A post without a signal' }] }
    } });
    assert.equal(noModel.result.isError, true);
    assert.match(noModel.result.content[0].text, /LLM 模型名称/);
  } finally { await client.close(); }
});
