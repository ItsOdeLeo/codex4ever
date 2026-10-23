import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

process.env.TZ = 'Europe/Berlin';

test('反复切换双假设及备用，仅使用建议有日期节点；正常刷新和宽度适配不变',async()=>{
  const originals={document:globalThis.document,localStorage:globalThis.localStorage,
    fetch:globalThis.fetch,Date:globalThis.Date,ResizeObserver:globalThis.ResizeObserver,window:globalThis.window};
  const NativeDate=originals.Date;
  globalThis.Date=class extends NativeDate {
    constructor(...args){super(...(args.length ? args : ['2026-10-18T12:00:00Z']));}
    static now(){return NativeDate.parse('2026-10-18T12:00:00Z');}
  };
  const elements=new Map();
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',hidden:false,
      classList:{add(){},remove(){}},listeners:{},contains:()=>true,
      addEventListener(name,handler){this.listeners[name]=handler;}});
    return elements.get(selector);
  };
  globalThis.document={querySelector:element};
  let saved={weeklyRemaining:40,weeklyResetDays:6,weeklyResetHours:10,
    resetDates:['2026-10-18','2026-10-23'],currentPhasePace:1,timelineOrientation:'vertical',presentationVersion:3};
  globalThis.localStorage={getItem:key=>key==='usage-planner-language' ? 'zh-CN' : JSON.stringify(saved),setItem(key,value){saved=JSON.parse(value);}};
  const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
  let fetches=0,resized;
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>archive};};
  globalThis.ResizeObserver=class {constructor(callback){resized=callback;}observe(){}};
  globalThis.window={listeners:{},addEventListener(name,callback){this.listeners[name]=callback;}};
  const output=element('#result');
  output.clientWidth=1920;
  try {
    await import('../src/web.js?bank-assumption-resize-regression');
    await new Promise(resolve=>setImmediate(resolve));
    const click=(selector,dataset={})=>output.listeners.click({target:{closest:query=>query===selector ? {dataset} : null}});
    const bank=index=>click('[data-backup-choice]',{backupChoice:String(index)});
    const second=()=>click('[data-assume-reset]',{assumptionSequence:'2'});
    const range=()=>[output.innerHTML.match(/data-timeline-from="([^"]+)"/)?.[1],
      output.innerHTML.match(/data-timeline-to="([^"]+)"/)?.[1]];
    const initialRange=range();
    assert.ok(initialRange.every(Boolean));
    const assertRange=()=>assert.deepEqual(range(),initialRange,'切换方案或窗口尺寸，日期范围不能跟着变化');
    const assertVisible=()=>{
      assertRange();
      assert.equal(element('#error').hidden,true,element('#error').textContent);
      for(const index of [0,1])assert.equal([...output.innerHTML.matchAll(new RegExp('data-backup-choice="'+index+'"','g'))].length,
        output.innerHTML.includes(`data-node-id="backup:${index}"`) ? 1 : 0,
        '只有建议使用的备用有日期操作入口');
      assert.doesNotMatch(output.innerHTML,/data-node-id="held:|保留备用 reset/);
      assert.match(output.innerHTML,/data-banked-count="2"/);
      assert.equal([...output.innerHTML.matchAll(/data-node-id="normal-reset"/g)].length,1);
      for(const sequence of [1,2])assert.equal([...output.innerHTML.matchAll(new RegExp('data-assumption-sequence="'+sequence+'"','g'))].length,1);
      assert.match(output.innerHTML,/data-density-sequence="1"/);
      assert.match(output.innerHTML,/data-density-sequence="2"/);
      assert.doesNotMatch(output.innerHTML,/NaN|undefined|data-timeline-direction|strategy-graph-vertical/);
      assert.match(output.innerHTML,/data-timeline-orientation="horizontal"/);
      assert.doesNotMatch(output.innerHTML,/data-usage-slider|data-phase-default/,'所有分支、假设和缩放后，图里都不生成用量控件');
    };
    // The one algorithm starts with the confidence-based count; the toggles
    // below choose the count explicitly (both assumptions to begin with).
    const refillCount=()=>[...output.innerHTML.matchAll(/data-refill-sequence="[12]"/g)].length;
    assertVisible();
    if(refillCount()!==2)second();
    assert.equal(refillCount(),2);
    assertVisible();
    for(let round=0;round<3;round++) {
      bank(1);
      assertVisible();
      second();
      assertVisible();
      second();
      assertVisible();
      for(const index of [0,1,0,1]){bank(index);assertVisible();}
    }
    const state=()=>[...output.innerHTML.matchAll(/data-backup-choice="(\d+)" aria-pressed="(true|false)"/g)]
      .map(match=>[match[1],match[2]]).sort();
    const banksBefore=state();
    assert.ok(banksBefore.length<=2);
    const forecastData=()=>[...output.innerHTML.matchAll(/data-(?:reset-estimate|reset-at)="([^"]+)"/g)].map(match=>match[1]);
    const forecastsBefore=forecastData();
    assert.equal(refillCount(),2);
    const rates=()=>[...output.innerHTML.matchAll(/data-phase-daily="([^"]+)"/g)].map(match=>match[1]);
    const ratesBefore=rates();
    for(const width of [340,480,640,800,960,1180,2560,640]) {
      // Use the observer's measurement even if clientWidth has not caught up.
      resized([{contentRect:{width}}]);
      const graphWidth=Number(output.innerHTML.match(/class="strategy-graph"(?: data-compact)? style="width:([\d.]+)px/)?.[1]);
      const padding=width<680 ? 14 : 24;
      // Phones fit the screen (captions replace the label gutter); mid widths keep a 640px scrolling canvas.
      const expected=width<480 ? width-padding*2-2 : Math.max(width-padding*2-2,width<680 ? 640 : 0);
      assert.ok(Math.abs(graphWidth-expected)<1e-6,graphWidth+' must fit '+width);
      assertVisible();
      assert.deepEqual(state(),banksBefore);
      assert.deepEqual(forecastData(),forecastsBefore);
      assert.deepEqual(rates(),ratesBefore);
      assert.equal(refillCount(),2);
    }
    assert.equal(typeof window.listeners.resize,'function','窗口 resize 也必须绑定实际重排');
    for(const width of [800,480,1500,640]) {
      output.clientWidth=width;
      window.listeners.resize();
      const graphWidth=Number(output.innerHTML.match(/class="strategy-graph" style="width:([\d.]+)px/)?.[1]);
      assert.ok(Math.abs(graphWidth-Math.max(width-(width<680 ? 30 : 50),width<680 ? 640 : 0))<1e-6);
      assertVisible();
      assert.deepEqual(rates(),ratesBefore);
    }
    output.clientWidth=1180;
    bank(1);
    assertVisible();
    second();
    assertVisible();
    click('[data-assume-reset]',{assumptionSequence:'1'});
    assertVisible();
    click('[data-assume-reset]',{assumptionSequence:'1'});
    assertVisible();
    click('[data-toggle-forecast]');
    assertRange();
    click('[data-toggle-forecast]');
    assertVisible();
    assert.equal(fetches,1,'切换与缩放复用证据，不重新抓取');
    assert.deepEqual(saved.resetDates,['2026-10-18','2026-10-23']);
    element('#inputs').listeners.click({target:{closest:()=>({dataset:{calendarDate:'2026-10-31'}})}});
    await element('#calculate').listeners.click();
    assert.notDeepEqual(range(),initialRange,'修改资源并重新计算时才建立新日期范围');
    assert.equal(fetches,2);
    const inputClick=dataset=>element('#inputs').listeners.click({target:{closest:()=>({dataset})}});
    for(const removeDate of [...saved.resetDates])inputClick({removeDate});
    for(const [field,value] of Object.entries({weeklyRemaining:80,weeklyResetDays:1,weeklyResetHours:0}))
      element('#inputs').listeners.input({target:{dataset:{field},value:String(value)}});
    await element('#calculate').listeners.click();
    const withoutBank=range();
    inputClick({calendarDate:'2027-05-01'});
    await element('#calculate').listeners.click();
    assert.deepEqual(range(),withoutBank,'本轮不需要的远期库存不能额外拉长时间轴');
    assert.match(output.innerHTML,/data-banked-count="1"/);
    assert.doesNotMatch(output.innerHTML,/data-retained-reset|2027-05-01 到期/);
    assert.doesNotMatch(output.innerHTML,/data-backup-choice="0"/,'正常刷新点不提供无意义的兑换按钮');
    const retainedHTML=output.innerHTML;
    bank(0);
    assert.equal(output.innerHTML,retainedHTML,'过时的备用按钮事件不能强制安排本轮不需要的兑换');
  } finally {
    for(const [key,value] of Object.entries(originals)){
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});

// A DOM stand-in: exercise the real page adapter without a browser or network.
test('实时证据、条件用量、备用切换和精简累计概率；保持当前用量仍真实耗尽',async()=>{
  const originals={document:globalThis.document,localStorage:globalThis.localStorage,
    fetch:globalThis.fetch,Date:globalThis.Date,ResizeObserver:globalThis.ResizeObserver};
  const NativeDate=originals.Date;
  globalThis.Date=class extends NativeDate {
    constructor(...args){super(...(args.length ? args : ['2026-10-14T12:00:00Z']));}
    static now(){return NativeDate.parse('2026-10-14T12:00:00Z');}
  };
  const elements=new Map();
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',hidden:false,
      classList:{add(){},remove(){}},listeners:{},contains:()=>true,
      addEventListener(name,handler){this.listeners[name]=handler;}});
    return elements.get(selector);
  };
  globalThis.document={querySelector:element};
  let saved;
  globalThis.localStorage={getItem:key=>key==='usage-planner-language' ? 'zh-CN' : JSON.stringify(saved??{credits:900,allowCredits:true,timelineOrientation:'vertical',presentationVersion:2}),
    setItem(key,value){saved=JSON.parse(value);}};
  const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
  const latestResetMention={sourceUrl:'https://x.com/thsottiaux/status/123',createdAt:'2026-10-14T11:00:00Z',
    text:'Let us try.',context:'Will Codex usage reset?',activityType:'reply',
    signal:{kind:'unknown',confidence:0}};
  const snapshot={...archive,retrievedAt:'2026-10-14',checkedAt:'2026-10-14T12:00:00Z',
    coverage:{history:{status:'live'},social:{status:'unavailable'}},classification:'explicit-text',
    latestResetMention,posts:[...(archive.posts??[]),latestResetMention]};
  const requests=[];
  // Like Cloudflare Pages: a missing /api path returns the HTML page with 200.
  globalThis.fetch=async url=>{requests.push(url);return url==='/api/reset-evidence'
    ? {ok:true,json:async()=>{throw new SyntaxError('Unexpected token <');}} : {ok:true,json:async()=>snapshot};};
  let resized;
  globalThis.ResizeObserver=class {
    constructor(callback){resized=callback;}
    observe(target){assert.equal(target,element('#result'));}
  };
  element('#result').clientWidth=1920;
  try {
    await import('../src/web.js');
    await new Promise(resolve=>setImmediate(resolve));
    const output=element('#result');
    const evidence=element('#forecast');
    const click=(selector,dataset={})=>(selector==='[data-toggle-forecast]' ? evidence : output)
      .listeners.click({target:{closest:query=>query===selector ? {dataset} : null}});
    assert.match(output.innerHTML,/data-policy-search="scenario-based-rolling-policy-search"/,
      '计算默认给出联合搜索的建议，而非只把预测写在固定用量旁边');
    assert.match(output.innerHTML,/data-plan-basis="predicted-extra-resets-first"/);
    const suggestedRange=output.innerHTML.match(/data-timeline-to="([^"]+)"/)?.[1];
    const suggestedEstimate=output.innerHTML.match(/data-reset-estimate="([^"]+)"/)?.[1];
    // One algorithm: explicitly counting no predicted reset is a user choice
    // of the same planner, not a different solver.
    const countNoReset=()=>{if(/data-assume-reset aria-pressed="true"/.test(output.innerHTML))click('[data-assume-reset]');
      assert.doesNotMatch(output.innerHTML,/data-assume-reset aria-pressed="true"/);};
    countNoReset();
    assert.match(output.innerHTML,/data-policy-search="scenario-based-rolling-policy-search"/,'同一个求解器');
    assert.equal(output.innerHTML.match(/data-timeline-to="([^"]+)"/)?.[1],suggestedRange);
    assert.equal(output.innerHTML.match(/data-reset-estimate="([^"]+)"/)?.[1],suggestedEstimate);
    assert.match(output.innerHTML,/data-timeline-orientation="horizontal"/,'固定横向，忽略旧的竖向设置');
    assert.doesNotMatch(output.innerHTML,/forecast-panel|planning-workspace|data-forecast-summary/,
      '输入和预测共用左侧栏，右侧不再嵌套第二个侧栏');
    assert.equal(saved.timelineOrientation,undefined,'不再保存或恢复方向设置');
    assert.equal(saved.presentationVersion,undefined);
    const forecast=()=>click('[data-toggle-forecast]');
    const probability=()=>evidence.innerHTML.match(/data-forecast-48-probability="([^"]+)"/)?.[1];
    const depletion=()=>output.innerHTML.match(/class="graph-node graph-depletion"[\s\S]*?<\/div>/)?.[0];
    const normal=()=>output.innerHTML.match(/data-node-id="normal-reset"[\s\S]*?<\/div>/)?.[0];
    assert.deepEqual(requests,['/api/reset-evidence','/data/reset-evidence.json'],'静态站把缺失路径答成 HTML 时继续读预计算快照');
    // No source status line under the chart: the forecast card carries the evidence.
    assert.doesNotMatch(output.innerHTML,/实时记录|X 回复暂缺/);
    const summary = () => evidence.innerHTML.match(/<section class="forecast-summary"[\s\S]*?<\/section>/)?.[0];
    assert.match(summary(),/data-forecast-stat="last-reset"/);
    assert.match(summary(),/data-forecast-stat="mean-interval"/);
    assert.match(summary(),/平均间隔的 95% 置信区间/);
    assert.match(summary(),/最可能 reset 时间/);
    assert.match(summary(),/80% 可能区间/);
    assert.match(summary(),/Tibo 最近相关回复/);
    assert.match(summary(),/<q>Let us try\.<\/q>/);
    assert.match(evidence.innerHTML,/data-forecast-summary/,
      '关键预测数据必须直接显示，不能藏在计算说明中');
    assert.match(evidence.innerHTML,/href="https:\/\/x.com\/thsottiaux\/status\/123"/);
    assert.match(evidence.innerHTML,/暂未识别/);
    const calendar=output.innerHTML.match(/<div class="forecast-calendar forecast-aligned"[\s\S]*?<\/div>/)?.[0];
    assert.equal(calendar,undefined,'累计值直接附着波峰，不再保留上方横排');
    assert.match(output.innerHTML,/class="reset-peak-cdf" data-forecast-peak-at=/);
    assert.match(output.innerHTML,/累计 [\d.]+%/);
    assert.match(output.innerHTML,/data-reset-density-plot/);
    assert.match(output.innerHTML,/class="reset-density-area"/);
    // Presentation must preserve the same forecast data/text.
    const withoutPosition=html=>html?.replace(/ style="[^"]*"/g,'');
    const mode = () => withoutPosition(output.innerHTML.match(/<div class="forecast-mode forecast-mode-on-plot"[\s\S]*?<\/div>/)?.[0]);
    assert.match(mode(), /data-reset-estimate=/);
    assert.match(mode(), /<small>累计 [\d.]+%<\/small>/);
    assert.doesNotMatch(output.innerHTML+evidence.innerHTML,/每小时|(?<!\d)1小时 [\d.]+%|此段 [\d.]+%|该 [\d.]+ 小时 [\d.]+%/);
    assert.match(mode(), /<strong>\d+月\d+日 \d{2}:\d{2}<small>/);
    assert.match(summary(),/data-forecast-stat="next-reset-mode"/);
    assert.doesNotMatch(mode(), /更早|更晚|附近/);
    const originalMode = mode();
    assert.doesNotMatch(output.innerHTML,/extra-reset-(ghost|arrow)|data-hypothetical|发生后重算|此时间情景/);
    assert.doesNotMatch(output.innerHTML,/保持当前用量|沿用已选用量|自选用量/,'不重复描述用量状态，直接显示每段日均');
    assert.doesNotMatch(output.innerHTML,/data-pace-multiplier|data-phase-pace|usage-choice/);
    assert.doesNotMatch(output.innerHTML,/用量 \+10%|用量 \+20%|用量增加|用量减少/);
    assert.match(output.innerHTML,/data-phase-daily="20"/);
    assert.doesNotMatch(output.innerHTML,/本周剩 40% · 刷新剩/,'左侧输入已显示剩余额度与刷新时间');
    assert.doesNotMatch(output.innerHTML.match(/<section class="strategy-panel"[\s\S]*?<\/section>/)[0],/÷/,
      '图表顶部不再展示计算公式');
    assert.doesNotMatch(output.innerHTML,/data-usage-calculation|60% ÷ 72小时 × 24/,
      '页面任何位置都不展示日均用量计算公式');
    const second=()=>withoutPosition(output.innerHTML.match(/<div class="forecast-following"[\s\S]*?<\/div>/)?.[0]);
    assert.match(second(),/aria-label="第二次 规划时刻 reset · /);
    assert.match(output.innerHTML,/<span class="timeline-lane-text">第二次 reset 概率<\/span>/);
    const originalSecond=second();
    assert.match(depletion(),/10月16日 14:00/,'初次打开默认按当前用量，2天耗尽');
    assert.match(output.innerHTML,/quota-paused-line/);
    assert.doesNotMatch(element('#inputs').innerHTML+output.innerHTML,/Credits|data-credits-allowed/i);
    const fixed=probability();
    const timelineRange=()=>output.innerHTML.match(/data-timeline-to="([^"]+)"/)?.[1];
    const fixedRange=timelineRange();

    const originalForecastSummary=summary();
    click('[data-assume-reset]');
    assert.match(output.innerHTML,/data-assume-reset aria-pressed="true"/);
    // Keep pace: the assumed reset refills quota but never retargets the pace.
    // The first phase keeps the current 20%/day, runs out at 40%*24/20 = 48h and
    // waits; use resumes, at the same pace, at the assumed (conservatively timed) reset.
    const phases=[...output.innerHTML.matchAll(/data-phase-start-at="([^"]+)" data-phase-daily="([^"]+)"/g)]
      .map(match=>({at:NativeDate.parse(match[1]),daily:Number(match[2])}));
    const opened=NativeDate.parse('2026-10-14T12:00:00Z');
    assert.deepEqual(phases[0],{at:opened,daily:20});
    assert.deepEqual(phases[1],{at:opened+40*24/20*3600000,daily:0},'保持当前用量，按当前用量耗尽后等待');
    assert.ok(phases.every(phase=>phase.daily===0||phase.daily===20),'假设的 reset 不改变用量');
    const resumed=phases.findIndex((phase,index)=>index>0&&phase.daily>0&&phases[index-1].daily===0);
    assert.ok(resumed>1);
    const assumedAt=new NativeDate(phases[resumed].at).toISOString();
    assert.ok(NativeDate.parse(assumedAt)>=NativeDate.parse(mode().match(/data-reset-estimate="([^"]+)"/)[1]),
      '假设放在保守时间，不早于最可能的小时');
    const localTime=instant=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Europe/Berlin',
      month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new NativeDate(instant));
    // The assumed reset is the first refill here (no bank is used before it), so the week restarts there.
    assert.doesNotMatch(output.innerHTML,/data-node-id="backup:/);
    assert.ok(normal().includes(localTime(NativeDate.parse(assumedAt)+168*3600000)),
      '第一次额外 reset 之后，页面正常刷新必须移动到该时刻七天后');
    assert.doesNotMatch(output.innerHTML,/class="phase-advice"/,'用量未被改动，不显示建议值');
    assert.match(output.innerHTML,/<span class="timeline-lane-text">日均用量<\/span>/);
    assert.doesNotMatch(output.innerHTML,/建议增加用量|建议减少用量|日均消耗 [\d.]+% →/);
    assert.match(output.innerHTML,/class="phase-controls" data-phase-start-at="2026-10-14T12:00:00.000Z"/);
    assert.doesNotMatch(output.innerHTML,/假设方案建议日均用量|0% → 100%/,'建议在实际线段上只显示一次，去掉重复补满说明');
    assert.match(output.innerHTML,/quota-refill-assumed-extra/);
    assert.match(output.innerHTML,/<strong class="phase-budget">20%<\/strong>/,'假设补满后继续展示实际日均');
    assert.equal(probability(),fixed);
    assert.equal(mode(),originalMode,'假设补满不修改预测钟点和概率');
    // With a first reset assumed, the second curve is conditioned on that assumed time.
    assert.match(second(),new RegExp(`data-conditional-on="${assumedAt}"`),'第二条曲线以计划假设的第一次时间为前提');
    const assumedSecond=second();
    assert.equal(summary(),originalForecastSummary);
    assert.equal(requests.length,2,'选择假设复用同一份证据，不重新抓取');
    const refillCount=()=>[...output.innerHTML.matchAll(/data-refill-sequence="[12]"/g)].length;
    const secondAction=()=>click('[data-assume-reset]',{assumptionSequence:'2'});
    assert.equal(refillCount(),1);
    secondAction();
    assert.equal(refillCount(),2,'第二次动作必须真的补满第二次，不只是增加文字');
    // The second assumed reset (a phase start, at or after its marker) restarts the week.
    const secondAt=second().match(/data-reset-at="([^"]+)"/)[1];
    const starts=[...output.innerHTML.matchAll(/data-phase-start-at="([^"]+)"/g)].map(match=>NativeDate.parse(match[1]));
    assert.ok(starts.some(start=>start>=NativeDate.parse(secondAt)-1000&&normal().includes(localTime(start+168*3600000))),
      '第二次额外 reset 再次覆盖正常刷新日期');
    assert.match(output.innerHTML,/data-assume-reset aria-pressed="true" data-assumption-sequence="2"/);
    assert.equal([...output.innerHTML.matchAll(/class="reset-action-cancel">不计入<\/small>/g)].length,2);
    assert.match(output.innerHTML,/data-density-sequence="1"/);
    assert.match(output.innerHTML,/data-density-sequence="2"/);
    assert.equal(mode(),originalMode);
    assert.equal(second(),assumedSecond);
    const chosenRates=[...output.innerHTML.matchAll(/data-phase-daily="([^"]+)"/g)].map(match=>match[1]);
    assert.match(output.innerHTML,/data-timeline-orientation="horizontal"/);
    assert.doesNotMatch(output.innerHTML,/data-timeline-direction|strategy-graph-vertical/);
    output.clientWidth=2560;
    resized([{contentRect:{width:2560}}]);
    assert.match(output.innerHTML,/class="strategy-graph" style="width:2510px/,'右侧直接使用全部可用宽度，不再扣除第二份预测侧栏');
    assert.equal(refillCount(),2);
    assert.equal(probability(),fixed);
    assert.equal(requests.length,2,'尺寸变化不重新获取证据');
    assert.deepEqual([...output.innerHTML.matchAll(/data-phase-daily="([^"]+)"/g)].map(match=>match[1]),chosenRates);
    secondAction();
    assert.equal(refillCount(),1,'缩放后第二次操作仍可取消');
    secondAction();
    assert.equal(refillCount(),2);
    output.clientWidth=1920;
    resized([{contentRect:{width:1920}}]);
    assert.equal(mode(),originalMode);
    assert.equal(second(),assumedSecond);
    assert.equal(refillCount(),2);
    secondAction();
    assert.equal(refillCount(),1,'取消第二次保留第一次');
    secondAction();
    click('[data-assume-reset]');
    assert.equal(refillCount(),0,'取消第一次同时取消后继假设');
    assert.match(output.innerHTML,/data-phase-daily="20"/);
    // Zero counted resets stays on the recommended solver: the no-reset plan, not a raw current-pace preview.
    assert.ok(depletion(),'取消全部假设后显示不含额外 reset 的推荐计划及耗尽点');
    assert.doesNotMatch(output.innerHTML,/quota-refill-assumed-extra/);
    secondAction();
    assert.equal(refillCount(),2,'直接选第二次自动启用第一次依赖');
    click('[data-assume-reset]');
    click('[data-assume-reset]');
    assert.equal(refillCount(),1,'重新选中第一次假设');
    assert.equal(refillCount(),1,'修改用量保留当前已选的第一次假设');
    click('[data-assume-reset]');
    forecast();
    assert.doesNotMatch(output.innerHTML,/quota-refill-assumed-extra|data-assume-reset/);
    forecast();
    assert.match(output.innerHTML,/data-assume-reset aria-pressed="false"/,'重新开启预测不暗中恢复假设');
    assert.equal(probability(),fixed);
    forecast();
    assert.match(summary(),/data-forecast-stat="last-reset"/,'关闭预测保留历史数据');
    assert.match(summary(),/平均间隔的 95% 置信区间/);
    // "Assume no reset" only stops counting the forecast: the chance tiles stay.
    assert.match(summary(),/data-forecast-horizon="12"/);
    assert.doesNotMatch(summary(),/下次 reset 预测<\/dt><dd>已关闭/);
    assert.equal(mode(), undefined);
    assert.equal(second(),undefined,'关闭预测同时隐藏第二次预测');
    assert.doesNotMatch(output.innerHTML, /data-reset-density-plot/);
    assert.equal(probability(),undefined);
    assert.doesNotMatch(output.innerHTML,/data-forecast-at=/);
    assert.match(output.innerHTML,/data-phase-daily="20"/,'关闭预测不改变已选用量');
    assert.match(depletion(),/10月16日 14:00/);
    assert.doesNotMatch(output.innerHTML,/data-phase-auto|采用算法建议|比当前减少|用量减少/);
    assert.match(output.innerHTML,/data-phase-daily="20"/);
    assert.match(depletion(),/10月16日 14:00/);
    assert.match(output.innerHTML,/quota-paused-line/);
    forecast();
    assert.equal(probability(),fixed);
    assert.equal(mode(), originalMode);
    assert.equal(second(),originalSecond);
    const originalSummary = summary();
    assert.equal(requests.length,2,'调整分支只用同一份已更新证据');
    element('#inputs').listeners.click({target:{closest:selector=>selector==='button'
      ? {dataset:{calendarDate:'2026-10-17'}} : null}});
    await element('#calculate').listeners.click();
    assert.equal(requests.length,4,'每次重新计算都会刷新公开数据');
    countNoReset();
    assert.match(normal(),/10月23日 14:00/);
    click('[data-backup-choice]',{backupChoice:'0'});
    assert.match(normal(),/10月18日 14:00/);
    assert.match(depletion(),/10月16日 14:00/);
    assert.equal(probability(),fixed);
    assert.equal(summary(),originalSummary,'用量和备用分支不会改变同一份预测数据');
    assert.equal(mode(),originalMode,'切换备用不改变最可能日期及其前后概率');
    click('[data-backup-choice]',{backupChoice:'0'});
    assert.match(normal(),/10月23日 14:00/);
    assert.doesNotMatch(output.innerHTML,/data-usage-slider|data-phase-default/);
    assert.equal(probability(),fixed);
    assert.equal('credits' in saved,false);
    assert.equal('allowCredits' in saved,false);
    assert.doesNotMatch(element('#inputs').innerHTML+output.innerHTML,/保持当前速度|Fast|session/i);
    await element('#calculate').listeners.click();
    countNoReset();
    assert.match(output.innerHTML,/data-phase-daily="20"/,'稳如老狗按当前日均用量');
    assert.equal(saved.currentPhasePace,undefined,'不再保存用量加量');
    assert.equal(saved.timelineOrientation,undefined);
    assert.doesNotMatch(output.innerHTML,/data-timeline-direction|strategy-graph-vertical/);
    await import('../src/web.js?reload-keeps-current-pace');
    await new Promise(resolve=>setImmediate(resolve));
    countNoReset();
    assert.match(output.innerHTML,/data-phase-daily="20"/,'刷新页面后仍按当前节奏');
    assert.match(output.innerHTML,/data-timeline-orientation="horizontal"/,'刷新后始终保持横向');
  } finally {
    for(const [key,value] of Object.entries(originals)) {
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});

test('截图交互回归：旧自动设置、备用反复切换、预测开关、后段选择及刷新均不暗中减量', async () => {
  const originals = { document: globalThis.document, localStorage: globalThis.localStorage,
    fetch: globalThis.fetch, Date: globalThis.Date };
  const NativeDate = originals.Date;
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-16T07:46:00Z'])); }
    static now() { return NativeDate.parse('2026-10-16T07:46:00Z'); }
  };
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', hidden: false,
      classList: { add() {}, remove() {} }, listeners: {}, contains: () => true,
      addEventListener(name, handler) { this.listeners[name] = handler; } });
    return elements.get(selector);
  };
  globalThis.document = { querySelector: element };
  let saved = { weeklyRemaining: 40, weeklyResetDays: 6, weeklyResetHours: 10,
    resetDates: ['2026-10-16', '2026-10-23'], currentPhasePace: null };
  globalThis.localStorage = { getItem: key => key==='usage-planner-language' ? 'zh-CN' : JSON.stringify(saved),
    setItem(key, value) { saved = JSON.parse(value); } };
  const archive = JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json', import.meta.url), 'utf8'));
  globalThis.fetch = async () => ({ ok: true, json: async () => archive });
  try {
    await import('../src/web.js?screenshot-regression');
    await new Promise(resolve => setImmediate(resolve));
    const output = element('#result');
    const click = (selector, dataset = {}) => (selector==='[data-toggle-forecast]' ? element('#forecast') : output).listeners.click({
      target: { closest: query => query === selector ? { dataset } : null } });
    const bank = index => click('[data-backup-choice]', { backupChoice: String(index) });
    assert.match(output.innerHTML,/data-policy-search=/);
    // Count no predicted reset (an explicit input of the one algorithm), so the
    // timeline below is the no-extra-reset path at the kept pace.
    const countNoReset = () => { if (/data-assume-reset aria-pressed="true"/.test(output.innerHTML)) click('[data-assume-reset]'); };
    countNoReset();
    // Zero is waiting with an empty quota, never a lower chosen pace.
    const assertRates = (expected = [102.9, 0]) => {
      assert.equal(element('#error').hidden, true, element('#error').textContent);
      assert.doesNotMatch(output.innerHTML, /比当前减少|用量减少|data-phase-auto|若两天后仍未额外 reset/);
      const daily = [...output.innerHTML.matchAll(/data-phase-daily="([\d.]+)"/g)].slice(1).map(match => Number(Number(match[1]).toFixed(1)));
      assert.ok(daily.length, '必须检查备用之后的用量，不能只检查首段');
      for (const rate of daily) assert.ok(expected.includes(rate), `出现未选择的用量 ${rate}`);
    };
    assertRates();
    assert.equal(saved.currentPhasePace, undefined, '旧版本保存的加量不再保存或恢复');
    // The initial optimizer chooses its bank path; hold both, then explicitly
    // use the first and finally the second, exercising both toggle directions.
    for (const index of [1, 0]) if (output.innerHTML.includes(`data-node-id="backup:${index}"`)) bank(index);
    assert.match(output.innerHTML, /10月16日 19:06/);
    assert.match(output.innerHTML, /quota-paused-line/);
    bank(0);
    assertRates();
    assert.match(output.innerHTML, /10月17日 18:26/);
    assert.match(output.innerHTML, /quota-paused-line/);
    bank(1);
    assertRates();
    assert.match(output.innerHTML, /10月18日 17:46/);
    click('[data-toggle-forecast]');
    assertRates();
    click('[data-toggle-forecast]');
    assertRates();
    bank(1);
    assertRates();
    bank(1);
    assertRates();
    await element('#calculate').listeners.click();
    countNoReset();
    assertRates();
    await import('../src/web.js?screenshot-reload');
    await new Promise(resolve => setImmediate(resolve));
    countNoReset();
    assertRates();
    assert.equal(saved.currentPhasePace, undefined);
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
