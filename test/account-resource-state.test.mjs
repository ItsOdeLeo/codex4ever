import test from 'node:test';
import assert from 'node:assert/strict';
import { accountResourceState } from '../src/account-resource-state.js';
import { planUsagePath } from '../src/usage-path-planner.js';

const now=new Date('2026-10-19T12:00:00Z'),timeZone='Europe/Berlin';
const snapshot=()=>({source:'codex-app-server',readAt:now.toISOString(),ordinaryUsageAllowed:true,
  weekly:{remainingPercent:62,periodHours:168,resetAt:'2026-10-25T12:37:11Z'},
  bankedResetCount:1,bankedResetDetailsComplete:true,
  bankedResets:[{expiresAt:'2026-10-20T03:17:42Z'}]});

test('API 快照的刷新、到期时间和窗口平均值保持精确，不经过日期／小时取整',()=>{
  const raw=snapshot(),before=structuredClone(raw);
  const base=accountResourceState(raw,{now,timeZone});
  assert.equal(base.normalResetAt,'2026-10-25T12:37:11.000Z');
  assert.equal(base.resets[0].expiresAt,'2026-10-20T03:17:42.000Z');
  assert.equal(base.resets[0].expiresOn,'2026-10-20');
  assert.equal(base.normalResetInHours,(Date.parse(raw.weekly.resetAt)-now.getTime())/3600000);
  assert.equal(base.averagePercentPerDay,38/((168-base.normalResetInHours)/24));
  const result=planUsagePath({usageSnapshot:raw,now,timeZone});
  assert.equal(result.resourceSource,'codex-app-server');
  assert.equal(result.originalNormalResetAt,base.normalResetAt);
  assert.equal(result.resets[0].expiresAt,base.resets[0].expiresAt);
  for(const event of result.milestones.points.flatMap(point=>point.events).filter(event=>event.kind==='backup'))
    assert.ok(Date.parse(event.at)<Date.parse(base.resets[event.resetIndex].expiresAt));
  assert.deepEqual(raw,before);
});

test('缺少备用到期时间时不伪造期限，新窗口缺少消耗时不编造速度',()=>{
  const raw=snapshot();raw.bankedResets=[{expiresAt:null}];
  const base=accountResourceState(raw,{now,timeZone});
  assert.equal(base.resets.length,0);assert.equal(base.resourceWarnings.length,1);
  raw.weekly={remainingPercent:100,periodHours:168,resetAt:'2026-10-26T11:59:59Z'};
  const fresh=planUsagePath({usageSnapshot:raw,now,timeZone});
  assert.equal(fresh.available,false);
  assert.equal(fresh.averagePercentPerDay,null);
});

test('过期快照、非周额度、禁用账户和错误时区均明确失败',()=>{
  for(const mutate of [s=>s.readAt='2026-10-19T11:44:59Z',s=>s.readAt='2026-10-19T12:01:00Z',
    s=>s.weekly.periodHours=5,s=>s.weekly.remainingPercent=101,s=>s.ordinaryUsageAllowed=false,
    s=>s.weekly.resetAt='2026-10-19T11:59:00Z',s=>s.bankedResets[0].expiresAt='invalid']) {
    const raw=snapshot();mutate(raw);assert.throws(()=>accountResourceState(raw,{now,timeZone}));
  }
  assert.throws(()=>accountResourceState(snapshot(),{now,timeZone:'invalid/zone'}));
});

test('手动输入与整点账户快照仍使用同一消耗／耗尽逻辑',()=>{
  const raw=snapshot();raw.weekly={remainingPercent:40,periodHours:168,resetAt:'2026-10-23T12:00:00Z'};
  raw.bankedResetCount=0;raw.bankedResets=[];
  const common={now,timeZone,heldResetIndices:[]};
  const manual=planUsagePath({...common,input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]}});
  const actual=planUsagePath({...common,usageSnapshot:raw});
  assert.equal(actual.normalResetAt,manual.normalResetAt);
  assert.equal(actual.averagePercentPerDay,manual.averagePercentPerDay);
  assert.deepEqual(actual.milestones.points,manual.milestones.points);
});
