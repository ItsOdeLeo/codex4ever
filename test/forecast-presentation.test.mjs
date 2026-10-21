import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { predictReset } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { conservativeResetTimes } from '../src/reset-forecast.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';
import { activePaletteSource,paletteValue } from './helpers/theme-source.mjs';

test('竖线、动作和补满点都对齐规划计入的保守时刻，不早于各自曲线最高峰；标签区分首次和第二次',()=>{
  const now=new Date('2026-10-17T12:00:00Z');
  const prediction=predictReset({now:now.toISOString(),timeZone:'Europe/Berlin',campaignTimeZone:'America/Los_Angeles',
    resetTimes:[3,7,11,13,15].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const result=planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:6,weeklyResetHours:10,resetDates:['2026-10-18']},
    now,timeZone:'Europe/Berlin',prediction,assumedResetCount:2});
  const graph=layoutStrategyTree(result,{prediction});
  for(const [sequence,focus,plot,peaks] of [[1,graph.forecastFocus,graph.probabilityPlot,graph.forecastPeaks],
    [2,graph.forecastFollowing,graph.followingPlot,graph.followingPeaks]]) {
    const peak=plot.bins.reduce((a,b)=>a.densityPerHour>=b.densityPerHour ? a : b);
    const action=graph.nodes.find(node=>node.type==='forecast-assumption'&&node.sequence===sequence);
    const refill=graph.funnel.refills.find(refill=>refill.sequence===sequence);
    // The plan counts each reset at its conservative time, not at the peak;
    // the guide line, the card and the plotted refill share that time.
    assert.equal(action.anchorX,refill.x);
    assert.ok(Math.abs(focus.x-action.anchorX)<1e-6,'竖线标在规划计入的时刻');
    assert.equal(focus.planned,true);
    assert.ok(focus.x>=peak.x-1e-6,'保守时刻不早于最可能时刻');
    assert.equal(action.selected,true);
    const boxes=[{left:focus.left,y:focus.y,width:focus.width,height:34},...peaks];
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++) {
      const a=boxes[i],b=boxes[j];
      assert.ok(a.left+a.width<=b.left||b.left+b.width<=a.left||a.y+a.height<=b.y||b.y+b.height<=a.y,
        '概率标签不能相互覆盖');
    }
  }
  const html=renderStrategyTree(graph,String);
  assert.match(html,/首次 reset · 规划时刻/);
  assert.match(html,/第二次 reset · 规划时刻/);
  assert.match(html,/已假设首次发布/);
  assert.match(html,/已假设第二次发布/);
  assert.equal([...html.matchAll(/class="reset-action-cancel">取消假设<\/small>/g)].length,2);
  assert.equal([...html.matchAll(/data-density-sequence=/g)].length,2);
  assert.equal([...html.matchAll(/data-assume-reset /g)].length,2);
});

test('两次曲线标题、累计概率及操作文字均达到小字号所需的4.5对比度',async()=>{
  const css=await readFile(new URL('../src/components/reset-element.css',import.meta.url),'utf8');
  const theme=await activePaletteSource();
  const luminance=hex=>{
    const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255)
      .map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  };
  const base=css.match(/\.reset-element\s*\{([^}]+)\}/)[1];
  const variant=css.match(/\.reset-element\[data-reset-element="2"\]\s*\{([^}]+)\}/)[1];
  const token=(rule,key)=>{
    const value=rule.match(new RegExp('--reset-'+key+':([^;]+)'))?.[1].trim();
    const variable=value?.match(/^var\((--[\w-]+)(?:,\s*(#[\da-f]+))?\)$/i);
    return variable ? paletteValue(theme,variable[1]) : value;
  };
  const background=luminance(token(base,'surface'));
  for(const [label,rule] of [['首次',base],['第二次',variant]]) {
    const color=token(rule,'text');
    const foreground=luminance(color);
    const contrast=(Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05);
    assert.ok(contrast>=4.5,`${label}组件的文字对比度只有 ${contrast.toFixed(2)}`);
  }
  assert.ok(parseFloat(token(base,'title-size'))>=12);
  assert.ok(parseFloat(token(base,'detail-size'))>=11);
  assert.doesNotMatch(variant,/--reset-(?:title-size|detail-size|line-width):/,'两次共用字号与线宽，变体只管理颜色');
  for(const role of ['forecast-first-curve','forecast-second-curve']) {
    const foreground=luminance(paletteValue(theme,role));
    assert.ok((Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05)>=4.5,
      '最可能时间和条件说明改成曲线颜色后，小字仍需可读');
  }
});

test('三个轨道名称统一放在独立最左栏，分别与两条分布及额度中心对齐，不占用线头位置',()=>{
  const now=new Date('2026-10-17T12:00:00Z'),timeZone='Europe/Berlin';
  const prediction=predictReset({now:now.toISOString(),timeZone,campaignTimeZone:'America/Los_Angeles',
    resetTimes:[3,7,11,13,15].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const result=planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:6,weeklyResetHours:10,resetDates:['2026-11-07']},
    now,timeZone,prediction,assumedResetCount:2});
  for(const viewportWidth of [270,640,1400,2200]) {
    const graph=layoutStrategyTree(result,{prediction,viewportWidth,locale:'en'});
    assert.equal(graph.width,viewportWidth);
    for(const [index,plot] of [graph.probabilityPlot,graph.followingPlot].entries()) {
      const label=graph.resetLaneLabels[index];
      assert.equal(label.x,0);
      assert.ok(label.x+label.width<graph.dayAxis.days[0].x);
      assert.ok(label.x+label.width<plot.startX);
      assert.equal(label.y+label.height/2,plot.topY+plot.height/2);
      assert.equal(label.inline,true);
      assert.equal(label.detail,'');
      assert.match(label.tooltip,/Probability density/);
    }
    const consumption=graph.headings.find(item=>item.kind==='consumption');
    assert.equal(consumption.x,0);
    assert.ok(consumption.x+consumption.width<graph.funnel.bands[0].x1);
    assert.equal(consumption.y+consumption.height/2,(graph.dayAxis.quotaTopY+graph.dayAxis.centerY)/2);
    const html=renderStrategyTree(graph,String);
    for(const id of ['reset-1','reset-2','consumption'])
      assert.equal([...html.matchAll(new RegExp(`data-lane-label="${id}"`,'g'))].length,1);
    assert.doesNotMatch(html,/class="reset-density-caption"/,'已有左侧轨道标签后，不再重复线头上方标题');
  }
});

test('假设卡片位于保守时刻；不计入时没有额外100%补满，计入时卡片与补满同点；关闭预测没有假设',()=>{
  const now=new Date('2026-10-16T08:00:00Z'),timeZone='Europe/Berlin';
  const prediction=predictReset({now:now.toISOString(),timeZone,campaignTimeZone:'America/Los_Angeles',
    resetTimes:[6,9,12,15].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const before=structuredClone(prediction);
  const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},snapshot=structuredClone(input);
  const plan=extra=>planUsagePath({input,now,timeZone,prediction,averagePercentPerDay:20,...extra});
  const conservative=conservativeResetTimes(plan({assumedResetCount:0}),prediction);
  const card=(graph,sequence)=>graph.nodes.find(node=>node.type==='forecast-assumption'&&node.sequence===sequence);
  // Neither a plan that counts nothing nor keep-available (no counted plan) adds a refill.
  for(const extra of [{assumedResetCount:0},{usageStrategy:'keep-available'}]) {
    const result=plan(extra),graph=layoutStrategyTree(result,{prediction});
    assert.equal(result.forecastScenario.selected,false);
    assert.equal(result.forecastScenario.at,conservative[0]);
    assert.equal(card(graph,1).selected,false);
    assert.equal(card(graph,1).atHours,(Date.parse(conservative[0])-now.getTime())/3600000);
    assert.equal(graph.funnel.refills.some(refill=>refill.kind==='assumed-extra'),false);
    assert.doesNotMatch(renderStrategyTree(graph,String),/data-assume-reset aria-pressed="true"/);
  }
  const counted=plan({assumedResetCount:1}),graph=layoutStrategyTree(counted,{prediction});
  const refill=graph.funnel.refills.find(refill=>refill.kind==='assumed-extra');
  assert.equal(counted.forecastScenario.selected,true);
  assert.equal(refill.at,conservative[0]);
  assert.equal(card(graph,1).anchorX,refill.x);
  assert.match(renderStrategyTree(graph,String),/data-assume-reset aria-pressed="true"/);
  assert.deepEqual(prediction,before,'假设不修改真实概率');
  assert.deepEqual(input,snapshot);
  assert.equal(counted.remainingPercent,40);
  const off=plan({prediction:null,assumedResetCount:1});
  assert.equal(off.forecastScenario.available,false);
  assert.equal(layoutStrategyTree(off).funnel.refills.some(refill=>refill.kind==='assumed-extra'),false);
});
