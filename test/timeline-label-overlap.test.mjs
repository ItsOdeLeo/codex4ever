import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planUsagePath } from '../src/usage-path-planner.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';

const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
const now=new Date('2026-10-13T14:00:00Z'),timeZone='Europe/Berlin';
const {prediction}=predictionFromArchive({archive,now,timeZone});

test('短阶段不印两组数字：窄阶段不显示 reset 概率，额度百分比互不重叠',()=>{
  let checked=0;
  for(const remaining of [50,90])for(const days of [3,6])for(const hours of [6,17,20])for(const usageStrategy of ['weekend-focus','weekdays','balanced']) {
    const result=planUsagePath({input:{weeklyRemaining:remaining,weeklyResetDays:days,weeklyResetHours:hours,resetDates:[]},
      now,timeZone,prediction,usageStrategy});
    const graph=layoutStrategyTree(result,{prediction}),html=renderStrategyTree(graph,String);
    const label=`${remaining}% ${days}d${hours}h ${usageStrategy}`;
    const wide=graph.phaseControls.filter(phase=>phase.width>=36&&phase.nextResetOpportunity).length;
    assert.equal((html.match(/data-reset-opportunity /g)??[]).length,wide,`${label}：窄阶段不显示 reset 概率`);
    const boxes=[...html.matchAll(/<text class="quota-label" x="([\d.]+)" y="[\d.]+" text-anchor="(start|end)">([^<]+)<\/text>/g)]
      .map(([,x,anchor,text])=>{const width=text.length*7+4;return anchor==='end' ? [+x-width,+x] : [+x,+x+width];})
      .sort((a,b)=>a[0]-b[0]);
    for(let i=1;i<boxes.length;i++)assert.ok(boxes[i][0]>=boxes[i-1][1],`${label}：额度百分比重叠`);
    checked++;
  }
  assert.equal(checked,36);
});
