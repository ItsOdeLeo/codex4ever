import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { strategyTimeAxis } from '../src/strategy-time-axis.js';
import { strategyTimeRange } from '../src/strategy-time-range.js';
import { planUsagePath,paceChoices } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';
import { predictReset } from '../src/local-predictor.js';

const now = '2026-10-15T08:00:00Z';
const timeZone = 'Europe/Berlin';
const input = {weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,credits:0,resetDates:['2026-10-17']};
const plan = extra => planUsagePath({input,now:new Date(now),timeZone,...extra});
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('一天等宽，日期在顶部按对应格定位；当前时刻和事件定位不按事件个数分摊', async () => {
  const axis = strategyTimeAxis({now,timeZone,endHours:96});
  assert.ok(axis.days.every(day=>day.width===axis.dayWidth));
  near(axis.xAtHours(2),axis.days[0].x+axis.dayWidth/2); // Now 10:00, noon two hours later.
  near(axis.xAtHours(48)-axis.xAtHours(0),axis.dayWidth*2);
  near(axis.xAtHours(12)-axis.xAtHours(0),axis.dayWidth/2);
  const graph=layoutStrategyTree(plan({heldResetIndices:[0]}));
  const usage=graph.funnel.bands[0];
  near(usage.x2-usage.x1,axis.dayWidth*2);
  near(graph.funnel.bands.filter(band=>band.kind==='pause').reduce((sum,band)=>sum+band.x2-band.x1,0),axis.dayWidth*2);
  assert.equal(graph.dayAxis.endHours,230,'按原始刷新与所有备用确定统一范围，不按当前保留方案裁短');
  assert.equal(graph.dayAxis.days.length,10);
  const labels=[...renderStrategyTree(graph,String).matchAll(/class="time-day" style="left:([\d.]+)px;width:([\d.]+)px">([^<]+)</g)];
  assert.deepEqual(labels.map(match=>[+match[1],+match[2],match[3]]),
    graph.dayAxis.days.map(day=>[day.x,day.width,day.label]));
  const css=await readFile(new URL('../src/styles/base.css',import.meta.url),'utf8');
  const dateStyle=css.match(/\.time-day\{([^}]+)\}/)?.[1]??'';
  assert.match(dateStyle,/position:absolute/,'只有日期坐标没有定位样式，会重新排成普通文字列');
  assert.match(dateStyle,/(?:^|;)top:0(?:;|$)/,'日期统一位于顶部，不能随普通文档流换行');
});

test('加速只把耗尽点向左移，备用及正常刷新按同一日历轴定位', () => {
  const base=layoutStrategyTree(plan());
  const faster=layoutStrategyTree(plan({paceMultiplier:1.2}));
  near(base.funnel.bands[0].x1,faster.funnel.bands[0].x1);
  near(base.funnel.bands[0].x2-faster.funnel.bands[0].x2,180*8/24);
  const bank=base.nodes.find(node=>node.type==='backup' && node.resetIndex===0);
  const refill=base.funnel.refills.find(refill=>refill.kind==='backup');
  near(bank.anchorX,refill.x);
  near(refill.x,base.funnel.bands[0].x2);
  const normal=base.nodes.find(node=>node.id==='normal-reset');
  near(normal.anchorX,base.funnel.refills.find(refill=>refill.kind==='normal').x);
});

test('扫描实际输出：首次／第二次假设、备用及正常补充均不重复显示耗尽，真实空档仍提示',()=>{
  const origin=new Date('2026-10-18T12:00:00Z'),at=hours=>new Date(origin.getTime()+hours*3600000).toISOString();
  const prediction={todayEndHours:10,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
    evidence:{dailyFrequency:.1},
    resetTimeMode:{pointAt:at(36.5),pointHours:36.5,fromHours:36,toHours:37,probability:.04},
    // Late enough that the second assumed reset also lands exactly on depletion.
    followingResetEstimate:{pointAt:at(170),pointHours:170,fromHours:169.5,toHours:170.5,
      probability:.04,cumulativeProbability:.4,conditionalOn:at(36.5)}};
  const options={input:{weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']},
    now:origin,timeZone,averagePercentPerDay:17,paceMultiplier:2,prediction};
  // These weak forecasts are below the automatic threshold; choose both explicitly.
  // Keep pace never retargets its pace, so use the strategy that allocates quota
  // to run out exactly at each next refill to reproduce depletion on a refill.
  const exact=planUsagePath({...options,assumedResetCount:2,usageStrategy:'maximize'});
  const recommended=planUsagePath({...options,assumedResetCount:2});
  const assumedHours=exact.recommendation.primary.assumedResetTimes.map(stamp=>(Date.parse(stamp)-origin.getTime())/3600000);
  assert.equal(assumedHours.length,2);
  for(const hour of assumedHours) {
    const point=exact.milestones.points.find(point=>Math.abs(point.hours-hour)<1e-6);
    assert.ok(point.reasons.includes('depletion'),'复现截图：内部记录恰好耗尽并补满');
    near(point.stateBefore.quota,0);near(point.stateAfter.quota,100);
  }
  const cases=[exact,recommended,
    planUsagePath({...options,assumedResetCount:1}),
    planUsagePath({...options,assumedResetCount:2,heldResetIndices:[0]}),
    planUsagePath({...options,prediction:null}),
    planUsagePath({...options,prediction:null,heldResetIndices:[0]})];
  for(const result of cases)for(const locale of ['en','zh-CN'])for(const viewportWidth of [360,1400]) {
    const before=structuredClone(result);
    const graph=layoutStrategyTree(result,{prediction:result.predictionEnabled ? prediction : null,locale,viewportWidth});
    const html=renderStrategyTree(graph,String);
    const depletionHours=[...html.matchAll(/data-node-id="depletion:([\d.]+)"/g)].map(match=>Number(match[1]));
    for(const refill of graph.funnel.refills) {
      const hour=(Date.parse(refill.at)-origin.getTime())/3600000;
      assert.ok(!depletionHours.some(value=>Math.abs(value-hour)<1e-6),
        `${refill.kind} 补充点 ${refill.at} 只能保留补充动作`);
    }
    const gaps=result.milestones.points.filter(point=>point.reasons.includes('depletion')
      &&point.stateAfter.quota===0&&point.hours<result.milestones.points.at(-1).hours-1e-6);
    // The exact plan has no real gap by construction; every other case has one.
    if(result!==exact)assert.ok(gaps.length>0,'同时覆盖真正耗尽后等待的情况，不能把全部耗尽提示删掉');
    for(const gap of gaps)assert.ok(depletionHours.some(value=>Math.abs(value-gap.hours)<1e-6));
    if(result===exact||result===recommended) {
      assert.equal(graph.funnel.refills.filter(refill=>refill.kind==='assumed-extra').length,2);
      assert.equal([...html.matchAll(/data-assume-reset aria-pressed="true"/g)].length,2);
    }
    assert.deepEqual(result,before,'去重只改变呈现，不修改真实耗尽、补给或用量');
  }
});

test('每段用量统一紧贴绿色额度上沿；假设、备用、窄屏均不再把文字上下分行',()=>{
  const origin=new Date('2026-10-18T12:00:00Z'),at=hours=>new Date(origin.getTime()+hours*3600000).toISOString();
  const prediction={todayEndHours:10,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
    evidence:{dailyFrequency:.1},
    resetTimeMode:{pointAt:at(33.7),pointHours:33.7,fromHours:33.2,toHours:34.2,probability:.04},
    followingResetEstimate:{pointAt:at(81.7),pointHours:81.7,fromHours:81.2,toHours:82.2,
      probability:.04,cumulativeProbability:.4,conditionalOn:at(33.7)}};
  for(const assumedResetCount of [0,1,2])
    for(const heldResetIndices of [[],[0]]) {
      const result=planUsagePath({input:{weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:6,resetDates:['2026-11-07']},
        now:origin,timeZone,averagePercentPerDay:17/18*24,prediction,heldResetIndices,assumedResetCount});
      const before=structuredClone(result);
      for(const viewportWidth of [270,640,1400,2200]) {
        const graph=layoutStrategyTree(result,{prediction,viewportWidth});
        const usage=graph.headings.find(heading=>heading.kind==='usage');
        if(graph.compact) {
          // Phones: one caption above the row names both lines; no left gutter.
          assert.equal(viewportWidth,270);
          assert.ok(usage.y+usage.height<=graph.phaseControls[0].y,'说明在数字行上方');
          assert.equal(graph.headings.some(heading=>heading.kind==='opportunity'),false);
          continue;
        }
        assert.equal(usage.x,0,'用量名称位于时间轴外的左侧公共栏');
        assert.ok(usage.width<=graph.dayAxis.leftPadding);
        assert.equal(usage.y,graph.phaseControls[0].y,'公共名称与各段数字对齐同一行');
        assert.equal(graph.headings.some(heading=>heading.kind==='opportunity'),false,'不再单列重置概率行');
        assert.equal(new Set(graph.phaseControls.map(phase=>phase.y)).size,1,'用量说明共用一条水平线');
        for(const [index,phase] of graph.phaseControls.entries()) {
          near(phase.y+phase.labelHeight+10,graph.dayAxis.quotaTopY);
          assert.equal(phase.quotaLabel,true);
          assert.ok(phase.x>=0&&phase.x+phase.width<=graph.width);
          if(index) {
            const previous=graph.phaseControls[index-1];
            assert.ok(previous.x+previous.width<=phase.x+1e-6,'窄窗口的短阶段也不与相邻文字重叠');
          }
        }
        const html=renderStrategyTree(graph,String);
        assert.match(html,/data-quota-label/);
        assert.equal([...html.matchAll(/data-lane-label="usage"/g)].length,1);
        assert.equal([...html.matchAll(/data-lane-label="opportunity"/g)].length,0);
        // Phases too narrow for a figure (< 36px) show none instead of overlapping.
        const values=[...html.matchAll(/<strong class="phase-(?:advice|budget)">([^<]+)<\/strong>/g)].map(match=>match[1]);
        assert.deepEqual(values,graph.phaseControls.filter(phase=>phase.width>=36)
          .map(phase=>`${Number(phase.dailyPercent.toFixed(1))}%`));
        assert.doesNotMatch(html,/用备用前 reset|Reset before backup/);
        for(const heading of graph.headings) {
          assert.equal(heading.inline,true);
          assert.equal(heading.state,'');
        }
        const captions=[...html.matchAll(/<div class="timeline-lane-label"[^>]*data-lane-inline[^>]*>([\s\S]*?)<\/div>/g)];
        // Usage and quota names are one line; the reset lanes add their explanation below.
        assert.ok(captions.length>=2);
        for(const [,content] of captions)assert.doesNotMatch(content,/<strong|<small|<br/,
          '用量与额度名称是同字号的一行文字');
        assert.equal(graph.funnel.shape,'area');
        for(const band of graph.funnel.bands) {
          const expectedBottom=`L ${band.x2} ${Number(graph.dayAxis.centerY.toFixed(6))} L ${band.x1} ${Number(graph.dayAxis.centerY.toFixed(6))} Z`;
          assert.ok(band.path.endsWith(expectedBottom),'每段底边水平，只有上边缘随余额下降');
        }
      }
      assert.deepEqual(result,before,'对齐文字不改变计划、耗尽时刻或概率');
    }
});

test('概率的时间点与额度使用同一坐标，切换路径仍对齐相同日期', () => {
  const prediction={todayEndHours:14,todayProbability:0.1,laterGivenNoReset:0.2,
    next48Probability:0.28,evidence:{dailyFrequency:0.1}};
  const base=layoutStrategyTree(plan({prediction}));
  // The page fixes the date range per snapshot; a bank toggle keeps it.
  const changed=layoutStrategyTree(plan({prediction,heldResetIndices:[0]}),{displayEndHours:base.dayAxis.endHours});
  // Each path lists the calendar up to its own end; shared dates align.
  const shared=changed.forecastLayout.filter(p=>base.forecastLayout.some(q=>q.at===p.at));
  assert.ok(shared.length>=4);
  for(const point of shared) {
    const same=base.forecastLayout.find(q=>q.at===point.at);
    assert.deepEqual([point.x,point.probability],[same.x,same.probability]);
  }
  const axis=strategyTimeAxis({now,timeZone,endHours:base.dayAxis.days.at(-1).endHours,leftPadding:base.dayAxis.leftPadding});
  base.forecastLayout.forEach(point=>near(point.x,axis.xAtHours(point.hours)));
  const html=renderStrategyTree(base,String);
  assert.match(html,/class="time-day"/);
  assert.match(html,/class="time-grid-line"/);
  assert.match(html,/class="forecast-calendar forecast-aligned"/);
});

test('首次与第二次假设固定同一排，缩放及切换状态只调整横向避让，不改变真实时间点',()=>{
  const origin=new Date('2026-10-18T12:00:00Z'),at=hours=>new Date(origin.getTime()+hours*3600000).toISOString();
  const prediction={todayEndHours:10,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
    evidence:{dailyFrequency:.1},
    resetTimeMode:{pointAt:at(36.5),pointHours:36.5,fromHours:36,toHours:37,probability:.04},
    followingResetEstimate:{pointAt:at(84.5),pointHours:84.5,fromHours:84,toHours:85,
      probability:.04,cumulativeProbability:.4,conditionalOn:at(36.5)}};
  for(const usageStrategy of ['balanced','weekdays'])
    for(const assumedResetCount of [0,1,2]) {
      const result=planUsagePath({input:{weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']},
        now:origin,timeZone,averagePercentPerDay:17,prediction,usageStrategy,assumedResetCount});
      const before=structuredClone(result);
      for(const locale of ['en','zh-CN'])for(const viewportWidth of [270,360,680,1400,2200]) {
        const graph=layoutStrategyTree(result,{prediction,viewportWidth,locale});
        const actions=graph.nodes.filter(node=>node.type==='forecast-assumption').sort((a,b)=>a.sequence-b.sequence);
        assert.equal(actions.length,2);
        const [first,second]=actions;
        assert.equal(first.y,second.y,`两个假设按钮必须同排：${locale}, ${viewportWidth}px, ${usageStrategy}`);
        assert.ok(first.x+first.width+16<=second.x+1e-6,'相邻按钮保留间隔，不重叠');
        const axis=strategyTimeAxis({now:origin.toISOString(),timeZone,endHours:graph.dayAxis.days.at(-1).endHours,
          dayWidth:graph.dayAxis.dayWidth,padding:graph.dayAxis.rightPadding,leftPadding:graph.dayAxis.leftPadding});
        for(const [index,action] of actions.entries()) {
          assert.ok(action.x>=0&&action.x+action.width<=graph.width);
          near(action.atHours,index===0 ? result.forecastScenario.hours : result.forecastScenario.following.hours);
          near(action.anchorX,axis.xAtHours(action.atHours));
          const connector=graph.edges.find(edge=>edge.to===action.id);
          assert.ok(connector.path.startsWith(`M ${action.anchorX} ${graph.dayAxis.centerY} `),
            '按钮横向避让后，连线仍指向真实预测时刻');
        }
        const cards=graph.nodes.filter(node=>node.width);
        for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++) {
          const a=cards[i],b=cards[j];
          assert.ok(a.y+a.height<=b.y || b.y+b.height<=a.y || a.x+a.width<=b.x || b.x+b.width<=a.x,
            `${a.id} 与 ${b.id} 不得重叠`);
        }
        const html=renderStrategyTree(graph,String);
        for(const action of actions) {
          const button=html.match(new RegExp(`<button[^>]*data-node-id="${action.id}"[^>]*>`))?.[0];
          assert.ok(button);
          assert.ok(button.includes(`--reset-top:${first.y}px`),'实际按钮渲染沿用共同的行坐标');
          assert.ok(button.includes(`aria-pressed="${action.selected}"`));
        }
      }
      assert.deepEqual(result,before,'按钮布局不得修改求解结果或预测概率');
    }
});

test('短时耗尽与多个标记不拉长时间，相邻文字分行且端点始终正确', () => {
  const graph=layoutStrategyTree(plan({input:{...input,weeklyRemaining:10,weeklyResetDays:6,credits:50,allowCredits:true}}));
  const first=graph.funnel.bands[0];
  near(first.x2-first.x1,180*(10/90));
  for(const node of graph.nodes.filter(node=>node.width)) {
    assert.ok(node.x>=0 && node.x+node.width<=graph.width);
    assert.ok(node.y>=0 && node.y+node.height<=graph.height);
    assert.ok(graph.edges.some(edge=>edge.to===node.id && edge.path.startsWith(`M ${node.anchorX} `)));
  }
  const cards=graph.nodes.filter(node=>node.width);
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++) {
    const a=cards[i],b=cards[j];
    assert.ok(a.y+a.height<=b.y || b.y+b.height<=a.y || a.x+a.width<=b.x || b.x+b.width<=a.x);
  }
});

test('夏令时切换的一天仍等宽，午夜事件准确落在日界线上', () => {
  const axis=strategyTimeAxis({now:'2026-10-24T08:00:00Z',timeZone,endHours:96});
  const extended=axis.days.find(day=>day.endHours-day.startHours===25);
  assert.ok(extended);
  assert.equal(extended.width,axis.dayWidth);
  near(axis.xAtHours(extended.endHours),extended.x+axis.dayWidth);
  near(axis.xAtHours(extended.startHours),extended.x);
});

test('横向按完整计划适应窗口，放大和缩小都会重排；尺寸变化不改变策略或概率',()=>{
  const prediction=predictReset({now,timeZone,campaignTimeZone:'America/Los_Angeles',
    resetTimes:[3,7,11,13].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const options={prediction};
  const conditional=plan({...options,assumedResetCount:2});
  const original=structuredClone(conditional);
  const canonical=layoutStrategyTree(conditional,{prediction});
  const quota=graph=>graph.funnel.bands.map(band=>[band.startAt,band.endAt,band.startQuota,band.endQuota]);
  const density=graph=>graph.probabilityPlot.bins.map(bin=>[bin.startAt,bin.probability,bin.cumulativeProbability]);
  const widths=[];
  for(const viewportWidth of [270,310,450,610,750,910,1130,2200]) {
    const graph=layoutStrategyTree(conditional,{prediction,viewportWidth});
    const dayWidth=graph.dayAxis.dayWidth;
    widths.push(dayWidth);
    near(dayWidth,(viewportWidth-graph.dayAxis.leftPadding-graph.dayAxis.rightPadding)/graph.dayAxis.days.length);
    near(graph.width,viewportWidth,'窄窗口也必须真正重排，不能被每日最小宽度卡住');
    assert.ok(graph.dayAxis.days.every(day=>day.width===dayWidth));
    assert.deepEqual(quota(graph),quota(canonical));
    assert.deepEqual(density(graph),density(canonical));
    const axis=strategyTimeAxis({now,timeZone,endHours:graph.dayAxis.days.at(-1).endHours,dayWidth,
      padding:graph.dayAxis.rightPadding,leftPadding:graph.dayAxis.leftPadding});
    for(const node of graph.nodes)near(node.anchorX??node.x,axis.xAtHours(node.atHours));
    near(graph.forecastFocus.x,axis.xAtHours(graph.forecastFocus.pointHours));
    const html=renderStrategyTree(graph,String);
    assert.match(html,/data-timeline-orientation="horizontal"/);
    const labels=graph.dayAxis.labels;
    assert.ok(labels.length>0);
    for(let index=1;index<labels.length;index++)assert.ok(labels[index].x-labels[index-1].x>=56-1e-6,
      '缩窄时减少日期标签，日期格仍等宽，不把文字挤到一起');
    assert.equal([...html.matchAll(/class="time-day"/g)].length,labels.length);
  }
  assert.ok(widths[0]<=widths[1]&&widths[1]<widths[2]&&widths[2]<widths[3]);
  const smaller=layoutStrategyTree(conditional,{prediction,viewportWidth:1340});
  const larger=layoutStrategyTree(conditional,{prediction,viewportWidth:2200});
  assert.ok(smaller.width<larger.width,'从全屏缩回时图表不能保留旧宽度');
  assert.ok(smaller.nodes.find(node=>node.id==='normal-reset').x+190<=smaller.width);
  assert.deepEqual(conditional,original);
});

test('备用使用／保留及首次／二次发布的162种选择共用日期、每日宽度和预测坐标',()=>{
  const now=new Date('2026-10-18T12:00:00Z');
  const prediction=predictReset({now:now.toISOString(),timeZone,campaignTimeZone:'America/Los_Angeles',
    resetTimes:[3,7,11,13,15,17].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const input={weeklyRemaining:40,weeklyResetDays:6,weeklyResetHours:10,resetDates:['2026-10-18','2026-10-23']};
  const options={input,now,timeZone,prediction};
  let canonical=null,canonicalSecondX=null,count=0;
  const normalTimes=new Set();
  for(const first of ['none','first','second'])for(let held=0;held<4;held++)for(let required=0;required<4;required++) {
    if(held&required)continue;
    for(const {multiplier} of paceChoices) {
      const indices=mask=>[0,1].filter(index=>mask&(1<<index));
      const result=planUsagePath({...options,assumedResetCount:{none:0,first:1,second:2}[first],
        heldResetIndices:indices(held),requiredResetIndices:indices(required),paceMultiplier:multiplier});
      const before=structuredClone(result);
      const graph=layoutStrategyTree(result,{prediction,viewportWidth:1400});
      const signature={dates:graph.dayAxis.days,labels:graph.dayAxis.labels,
        dayWidth:graph.dayAxis.dayWidth,nowX:graph.dayAxis.nowX,endHours:graph.dayAxis.endHours,
        // The legacy selected preview conditions the second curve on the most
        // likely first time; every other choice uses the conservative one.
        firstX:graph.forecastFocus.x,...(first==='none' ? {secondX:graph.forecastFollowing.x} : {}),
        probabilities:graph.probabilityPlot.bins.map(bin=>[bin.startAt,bin.x,bin.probability])};
      const {secondX,...shared}=signature;
      if(canonical)assert.deepEqual(shared,canonical,`${first}; held=${held}; required=${required}; pace=${multiplier}`);
      else canonical=shared;
      if(secondX!==undefined) {
        if(canonicalSecondX!==null)assert.equal(secondX,canonicalSecondX);
        canonicalSecondX=secondX;
      }
      assert.ok(result.milestones.points.at(-1).hours<=graph.dayAxis.endHours,'固定范围必须容纳真实的后继刷新');
      assert.ok(graph.nodes.every(node=>(node.anchorX??node.x)<=graph.width));
      normalTimes.add(result.normalResetAt);
      assert.deepEqual(result,before,'日期轴只能改呈现，不能修改用量、耗尽或刷新算法');
      count++;
    }
  }
  assert.equal(count,162);
  assert.ok(normalTimes.size>1,'实际刷新仍随选择变化，仅日期刻度固定');
  const earlier=planUsagePath({...options,input:{...input,resetDates:[]},prediction:null});
  const later=planUsagePath({...options,input:{...input,resetDates:['2026-10-18','2026-10-23','2026-10-31']}});
  assert.ok(strategyTimeRange(later,{prediction})>strategyTimeRange(earlier),'新输入可以确定新的显示范围');
});

test('显示范围包含到期前最后一小时兑换后的正常刷新，不把安全提前量当成硬边界',()=>{
  const result={now,originalNormalResetAt:'2026-10-17T08:00:00Z',resets:[{expiresInHours:24}]};
  assert.equal(strategyTimeRange(result),24+168);
});

const flexNow=new Date('2026-10-15T08:00:00Z');
const flexInput={weeklyRemaining:25,weeklyResetDays:4,weeklyResetHours:0,resetDates:['2026-10-16','2026-10-23']};
test('额外重置只显示各日累计概率，不跳日、不画假想100%补满',()=>{
  const prediction=predictReset({now:flexNow.toISOString(),timeZone,priorDailyProbability:.3});
  const result=planUsagePath({input:flexInput,now:flexNow,timeZone,prediction});
  // Regression: the old display subtracted adjacent CDF values and selected
  // two separated windows, showing 22% then 13.2% instead of 22/39.2/52.4%.
  result.forecastCalendar=[38,62,86].map((hours,index)=>({hours,
    at:new Date(flexNow.getTime()+hours*3600000).toISOString(),probability:[.22,.392,.524][index]}));
  const graph=layoutStrategyTree(result);
  assert.deepEqual(graph.forecastLayout.map(point=>point.probability),[.22,.392,.524]);
  assert.deepEqual(graph.forecastLayout.map(point=>point.label),['截至 10/16','截至 10/17','截至 10/18']);
  for(const point of graph.forecastLayout) {
    assert.ok(point.x>=0 && point.x<graph.width);
    assert.ok(point.left>=0 && point.left+point.width<=graph.width);
  }
  assert.equal(graph.funnel.refills.filter(refill=>refill.kind==='extra-reset').length,0);
  const html=renderStrategyTree(graph,String);
  for(const probability of ['22','39.2','52.4'])assert.ok(html.includes(`额外重置 ${probability}%`));
  assert.doesNotMatch(html,/extra-reset-(ghost|arrow)|data-hypothetical|发生后重算|此时间情景|>可能额外 reset</);
  assert.equal(layoutStrategyTree(planUsagePath({input:flexInput,now:flexNow,timeZone})).forecastLayout.length,0);
});
