import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { createUsagePlannerState,updateUsagePlanner,usagePlannerInput } from '../src/usage-planner-state.js';
import { pluginPageClient } from '../src/plugin-page-client.js';

const now='2026-10-19T00:00:00.000Z',timeZone='Asia/Shanghai';
const usageSnapshot={source:'codex-app-server',readAt:now,timeZone,ordinaryUsageAllowed:true,
  weekly:{remainingPercent:59,periodHours:168,resetAt:'2026-10-24T21:02:42.000Z'},
  short:null,bankedResetCount:1,bankedResetDetailsComplete:true,
  bankedResets:[{expiresAt:'2026-11-06T23:39:54.000Z'}]};
const result=planUsagePath({usageSnapshot,now:new Date(now),timeZone,
  recommendationMode:'feedback'});
const session={usageSnapshot,timeZone,language:'en',prediction:null,forecastSource:{available:false,reason:'预测数据暂不可用'},
  planning:{recommendationMode:'feedback'},result};

test('页面导入精确 MCP 结果，调量仍沿用账户时间与反馈策略，显式假设独立于推荐',()=>{
  const imported=updateUsagePlanner(createUsagePlannerState(),{type:'import-mcp-plan',session});
  assert.deepEqual(imported.result,result);
  const adapted=usagePlannerInput(imported);
  assert.deepEqual(adapted.usageSnapshot,usageSnapshot);
  assert.equal(adapted.input,undefined,'不能用取整后的表单重建账户');
  assert.equal(adapted.recommendationMode,'feedback');
  const adjusted=updateUsagePlanner(imported,{type:'set-usage',step:2});
  assert.equal(adjusted.result.originalNormalResetAt,usageSnapshot.weekly.resetAt);
  assert.equal(adjusted.result.resets[0].expiresAt,usageSnapshot.bankedResets[0].expiresAt);
  assert.equal(adjusted.result.strategy.conditional,false);
  assert.equal(adjusted.result.recommendation.mode,'feedback');
  assert.equal(adjusted.timeZone,timeZone);
  assert.equal(adjusted.displayEndHours,imported.displayEndHours);
  const manual=updateUsagePlanner(imported,{type:'new-snapshot',input:{weeklyRemaining:30,
    weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},now:new Date(now),prediction:null});
  assert.equal(usagePlannerInput(manual).usageSnapshot,undefined);
  assert.equal(usagePlannerInput(manual).input.weeklyRemaining,30);
});

test('浏览器只向同源 API 发送临时访问凭证，轮询不触发账户或证据刷新',async()=>{
  const calls=[],token='a'.repeat(64);
  const client=pluginPageClient({hash:`#planner=${token}`},async(path,options)=>{
    calls.push({path,options});return {ok:true,json:async()=>({revision:1,session})};
  });
  await client.read();await client.read(1);await client.refresh({usageStrategy:'weekdays',paceMultiplier:1.5});
  assert.deepEqual(calls.map(call=>[call.path,call.options.method]),[
    ['/api/session','GET'],['/api/session?after=1','GET'],['/api/refresh','POST']]);
  assert.ok(calls.every(call=>call.options.headers.Authorization===`Bearer ${token}`));
  assert.deepEqual(JSON.parse(calls[2].options.body),{usageStrategy:'weekdays',paceMultiplier:1.5});
  assert.equal(pluginPageClient({hash:'#planner=invalid'}),null);
  assert.equal(pluginPageClient({hash:''}),null);
});

test('真实网页入口从 MCP 会话呈现数据，不加载示例账户，也不启动独立取证计算',async()=>{
  const keys=['document','localStorage','fetch','location','window','setTimeout'];
  const original=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
  const elements=new Map(),requests=[],timers=[];
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',hidden:false,clientWidth:1400,
      classList:{add(){},remove(){}},listeners:{},contains:()=>true,
      addEventListener(name,callback){this.listeners[name]=callback;},setAttribute(){}});
    return elements.get(selector);
  };
  globalThis.document={querySelector:element};
  globalThis.localStorage={getItem:()=>null,setItem(){throw new Error('导入账户不能持久化到页面偏好');}};
  globalThis.location={hash:`#planner=${'b'.repeat(64)}`};
  globalThis.window={addEventListener(){}};
  globalThis.setTimeout=(callback,delay)=>{timers.push({callback,delay});return timers.length;};
  globalThis.fetch=async path=>{requests.push(path);return {ok:true,json:async()=>({revision:3,session})};};
  try {
    await import('../src/web.js?plugin-session-integration');
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(requests,['/api/session']);
    assert.match(element('#inputs').innerHTML,/value="59"/);
    assert.match(element('#result').innerHTML,/59%/);
    assert.match(element('#result').innerHTML,/data-policy-search/);
    assert.match(element('#status').textContent,/Connected to local MCP/);
    assert.equal(element('#error').hidden,true,element('#error').textContent);
    assert.equal(timers.length,1);
    await timers[0].callback();
    assert.deepEqual(requests,['/api/session','/api/session?after=3']);
    await element('#calculate').listeners.click();
    assert.equal(requests.at(-1),'/api/refresh');
  }finally {for(const key of keys)if(original[key]===undefined)delete globalThis[key];else globalThis[key]=original[key];}
});
