import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,cp,writeFile,chmod,rm } from 'node:fs/promises';
import { spawn,execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request as httpRequest } from 'node:http';

const plugin=new URL('../plugins/codex4ever/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('plugin.json',plugin),'utf8'));

function clientAt(entry,env={}) {
  const child=spawn(process.execPath,[entry],{cwd:tmpdir(),
    env:{...process.env,CODEX4EVER_HOME:join(tmpdir(),`codex4ever-home-test-${process.pid}-${Math.random()}`),
      CODEX4EVER_ALERT_FILE:join(tmpdir(),`codex4ever-alerts-test-${process.pid}-${Math.random()}.json`),...env},stdio:['pipe','pipe','pipe']});
  child.stderr.resume();
  const pending=new Map();let id=0;
  createInterface({input:child.stdout}).on('line',line=>{
    const message=JSON.parse(line),item=pending.get(message.id);
    if(item){pending.delete(message.id);item.resolve(message);}
  });
  child.once('exit',()=>{for(const item of pending.values())item.reject(new Error('Plugin MCP exited'));pending.clear();});
  const request=(method,params={})=>new Promise((resolve,reject)=>{
    const requestId=++id,timer=setTimeout(()=>{pending.delete(requestId);reject(new Error(`${method} timed out`));},15000);
    pending.set(requestId,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})+'\n');
  });
  return {request,call:async(name,args={})=>(await request('tools/call',{name,arguments:args})).result,
    initialize:async()=>{
      await request('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'plugin-package-test',version:'1'}});
      child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    },close:async()=>{child.stdin.end();if(child.exitCode===null)await once(child,'exit');}};
}

test('插件身份、启动配置、兼容清单和发行 ZIP 相互一致，不依赖开发机绝对路径',async()=>{
  const mcp=JSON.parse(await readFile(new URL('mcp.json',plugin),'utf8'));
  const legacy=JSON.parse(await readFile(new URL('.codex-plugin/plugin.json',plugin),'utf8'));
  assert.equal(manifest.name,'codex4ever');assert.equal(legacy.name,manifest.name);
  assert.equal(legacy.version,manifest.version);
  assert.equal(manifest.homepage,'https://codex4ever.com');
  assert.equal(manifest.author.url,'https://x.com/ItsOdeLeo');
  assert.equal(mcp.mcpServers.codex4ever.args[0],'${PLUGIN_ROOT}/server/codex4ever.mjs');
  const bundle=await readFile(new URL('server/codex4ever.mjs',plugin),'utf8');
  assert.doesNotMatch(bundle,/\/Users\/[^/\n]+\/Documents\/ChatGPT\//);
  const entries=execFileSync('unzip',['-Z1',new URL(`../output/codex4ever-plugin-${manifest.version}.zip`,import.meta.url).pathname],{encoding:'utf8'}).trim().split('\n');
  assert.ok(entries.includes('server/codex4ever.mjs'));
  assert.ok(entries.includes('skills/codex-usage/SKILL.md'));
  assert.ok(entries.includes('THIRD_PARTY_NOTICES.txt'));
  assert.ok(entries.includes('experiments/public-reset-events.json'));
  for(const entry of ['web/index.html','web/app.js','web/app.css','web/public/fonts/vt323/VT323-Regular.ttf',
    'web/public/fonts/vt323/OFL.txt','web/guide/index.html'])assert.ok(entries.includes(entry),entry);
  for(const entry of entries)assert.doesNotMatch(entry,/(?:^|\/)(?:\.env[^/]*|\.git|output|node_modules|test)(?:\/|$)/);
});

test('干净安装副本可直接读取账户并用精确快照规划，无 session／Fast／独立模型 API',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'codex4ever-plugin-'));
  await cp(plugin,join(temp,'installed'),{recursive:true});
  const command=join(temp,'codex-mock.mjs');
  const at=hours=>Math.floor((Date.now()+hours*3600000)/1000);
  const normal=at(143.125),expiry=at(18.25);
  const raw={accountId:'private-account-id',ordinaryUsageAllowed:true,
    rateLimitsByLimitId:{codex:{primary:{usedPercent:38,windowDurationMins:10080,resetsAt:normal},
      secondary:null,credits:{balance:'123.45',hasCredits:true}}},
    rateLimitResetCredits:{availableCount:1,credits:[{id:'private-reset-id',status:'available',resetType:'codexRateLimits',expiresAt:expiry}]}};
  await writeFile(command,`#!${process.execPath}\nimport{createInterface}from'node:readline';createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);if(q.id===1)console.log(JSON.stringify({id:1,result:{}}));if(q.id===2)console.log(JSON.stringify({id:2,result:${JSON.stringify(raw)}}));});\n`);
  await chmod(command,0o755);
  const client=clientAt(join(temp,'installed/server/codex4ever.mjs'),{CODEX4EVER_CODEX_CLI:command,CODEX4EVER_LLM_MODEL:''});
  try {
    await client.initialize();
    const tools=(await client.request('tools/list')).result.tools;
    const read=tools.find(tool=>tool.name==='get_usage_snapshot');
    assert.ok(read);assert.equal(read.annotations.readOnlyHint,true);
    assert.equal(read.inputSchema.properties.sessions,undefined);
    const response=await client.call('get_usage_snapshot',{timeZone:'America/New_York'});
    assert.equal(response.isError,undefined,response.content?.[0]?.text);
    const {usageSnapshot,pace}=response.structuredContent;
    assert.equal(usageSnapshot.weekly.remainingPercent,62);
    assert.equal(usageSnapshot.weekly.resetAt,new Date(normal*1000).toISOString());
    assert.equal(usageSnapshot.bankedResets[0].expiresAt,new Date(expiry*1000).toISOString());
    assert.equal(usageSnapshot.credits,undefined);
    assert.ok(pace.averagePercentPerDay>0);
    assert.doesNotMatch(JSON.stringify(response),/private-account-id|private-reset-id|123\.45/);
    const readAt=Date.parse(usageSnapshot.readAt);
    const evidence={now:usageSnapshot.readAt,timeZone:usageSnapshot.timeZone,
      resetTimes:[20,15,11,7,3].map(days=>new Date(readAt-days*86400000).toISOString()),posts:[]};
    const result=await client.call('plan_usage_strategy',{usageSnapshot,evidence,classifyPosts:false});
    assert.equal(result.isError,undefined,result.content?.[0]?.text);
    const plan=result.structuredContent;
    assert.equal(plan.strategy.method,'scenario-based-rolling-policy-search');
    assert.equal(plan.now,usageSnapshot.readAt);
    assert.equal(plan.timeZone,'America/New_York');
    assert.equal(plan.originalNormalResetAt,usageSnapshot.weekly.resetAt);
    assert.equal(plan.resets[0].expiresAt,usageSnapshot.bankedResets[0].expiresAt);
    assert.equal(plan.predictionEnabled,true);
    // The installed plugin uses the website's rule: confident resets are counted.
    assert.equal(plan.strategy.conditional,true);
    assert.equal(plan.actionPlan.basis,'conditional-forecast-preview');
    assert.equal(plan.actionPlan.recommendation.dailyPercent,plan.recommendation.firstAction.dailyPercent);
    assert.match(result.content[0].text,/Suggested consumption|Wait for now|Rest until/);
    const opened=await client.call('open_planner');
    assert.equal(opened.isError,undefined,opened.content?.[0]?.text);
    const url=new URL(opened.structuredContent.url);
    assert.equal(url.hostname,'127.0.0.1');
    const token=new URLSearchParams(url.hash.slice(1)).get('planner');
    const headers={Authorization:`Bearer ${token}`};
    const html=await fetch(url);
    assert.equal(html.status,200);
    const page=await html.text();
    const script=page.match(/src="(\/app\.js\?v=[0-9a-f]{12})"/)?.[1],style=page.match(/href="(\/app\.css\?v=[0-9a-f]{12})"/)?.[1];
    assert.ok(script&&style,'资源地址带内容指纹，浏览器不会混用旧脚本');
    assert.equal((await fetch(new URL(script,url))).status,200);
    assert.equal((await fetch(new URL(style,url))).status,200);
    assert.equal((await fetch(new URL('/public/fonts/vt323/VT323-Regular.ttf',url))).status,200);
    const state=await (await fetch(new URL('/api/session',url),{headers})).json();
    assert.equal(state.session.usageSnapshot.readAt,usageSnapshot.readAt);
    assert.equal(state.session.usageSnapshot.weekly.remainingPercent,usageSnapshot.weekly.remainingPercent);
    assert.equal(state.session.usageSnapshot.weekly.resetAt,usageSnapshot.weekly.resetAt);
    assert.deepEqual(state.session.usageSnapshot.bankedResets,usageSnapshot.bankedResets);
    assert.deepEqual(state.session.result,plan,'网页导入 MCP 的计算结果，不另算一套');
    assert.deepEqual(state.session.evidence,evidence);
    assert.equal(state.session.planning.recommendationMode,'forecast-preview','插件页面沿用与网页相同的默认规则');
    const unchanged=await (await fetch(new URL(`/api/session?after=${state.revision}`,url),{headers})).json();
    assert.deepEqual(unchanged,{revision:state.revision});
    assert.equal((await fetch(new URL('/api/session',url))).status,401);
    assert.equal((await fetch(new URL('/api/session',url),{headers:{...headers,Origin:'https://example.com'}})).status,403);
    const wrongHost=await new Promise((resolve,reject)=>{
      const req=httpRequest(new URL('/api/session',url),{headers:{...headers,Host:'attacker.example'}},res=>{
        res.resume();resolve(res.statusCode);
      });req.on('error',reject);req.end();
    });
    assert.equal(wrongHost,403);
    for(const path of ['/src/mcp-server.js','/output/mcp-live-demo.json','/.env','/server/codex4ever.mjs','/api/reset-evidence'])
      assert.equal((await fetch(new URL(path,url),{headers})).status,404,path);
    const compact=await client.call('plan_usage_strategy',{usageSnapshot,evidence,includeDetails:false,language:'zh-CN'});
    const synced=await (await fetch(new URL('/api/session',url),{headers})).json();
    assert.equal(synced.revision,state.revision+1);
    assert.deepEqual(synced.session.result.actionPlan,compact.structuredContent.actionPlan);
    const blocked=await client.call('plan_usage_strategy',{usageSnapshot:{...usageSnapshot,
      short:{remainingPercent:0,periodHours:5,resetAt:new Date(readAt+3600000).toISOString()}}});
    assert.equal(blocked.isError,undefined);
    assert.equal(blocked.structuredContent.available,false);
    assert.equal(blocked.structuredContent.strategy,null);
    assert.equal(blocked.structuredContent.actionPlan.status,'blocked');
    assert.match(blocked.content[0].text,/Short-window quota is exhausted/);
    const invalid=await client.call('plan_usage_strategy',{usageSnapshot,
      input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]}});
    assert.equal(invalid.isError,true);
    const stale=await client.call('plan_usage_strategy',{usageSnapshot,now:new Date(readAt+16*60000).toISOString()});
    assert.equal(stale.isError,true);
    assert.match(stale.content[0].text,/快照/);
    const oldReadAt=new Date(readAt-16*60000).toISOString();
    const frozen=await client.call('plan_usage_strategy',{usageSnapshot:{...usageSnapshot,readAt:oldReadAt},now:oldReadAt});
    assert.equal(frozen.isError,true,'把规划时钟固定在旧时间也不能绕过账户快照时效');
    await client.close();
    await assert.rejects(fetch(url),'MCP 退出时必须关闭其本地网页服务');
  }finally {await client.close();await rm(temp,{recursive:true,force:true});}
});

test('无法读取本机 Codex 时返回错误，不以示例账户冒充真实库存',async()=>{
  const client=clientAt(new URL('server/codex4ever.mjs',plugin).pathname,{CODEX4EVER_CODEX_CLI:'/nonexistent-codex-cli'});
  try {
    await client.initialize();
    const response=await client.call('get_usage_snapshot');
    assert.equal(response.isError,true);
    assert.equal(response.structuredContent,undefined);
  }finally {await client.close();}
});
