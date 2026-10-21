import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('真实页面策略按钮驱动统一规划，切换不抓取证据、不改日期轴；取消、关闭和重载保留约束',async()=>{
  const originals={document:globalThis.document,localStorage:globalThis.localStorage,
    fetch:globalThis.fetch,Date:globalThis.Date,ResizeObserver:globalThis.ResizeObserver};
  const NativeDate=originals.Date,stamp='2026-10-16T12:00:00Z';
  globalThis.Date=class extends NativeDate {
    constructor(...args){super(...(args.length ? args : [stamp]));}
    static now(){return NativeDate.parse(stamp);}
  };
  const elements=new Map(),element=selector=>{
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',hidden:false,clientWidth:1280,
      classList:{add(){},remove(){}},listeners:{},contains:()=>true,
      addEventListener(name,handler){this.listeners[name]=handler;},setAttribute(){}});
    return elements.get(selector);
  };
  globalThis.document={querySelector:element};
  let saved={weeklyRemaining:80,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']};
  globalThis.localStorage={getItem:key=>key==='codex4ever-language' ? 'en' : JSON.stringify(saved),
    setItem(key,value){if(key!=='codex4ever-language')saved=JSON.parse(value);}};
  const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
  let fetches=0;
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>archive};};
  globalThis.ResizeObserver=undefined;
  try {
    await import('../src/web.js?usage-strategies');
    await new Promise(resolve=>setImmediate(resolve));
    const output=element('#result'),strategies=element('#strategy-controls');
    const click=(selector,dataset={})=>(selector==='[data-toggle-forecast]' ? element('#forecast')
      : selector==='[data-usage-strategy]' ? strategies : output)
      .listeners.click({target:{closest:query=>query===selector ? {dataset} : null}});
    const checkControls=()=>{
      assert.equal([...strategies.innerHTML.matchAll(/data-usage-strategy=/g)].length,5,'策略入口只在计算按钮旁显示一组');
      assert.doesNotMatch(output.innerHTML,/data-usage-strategy|data-plan-mode|policy-recommendation|Preview selected usage/,
        '右侧不重复策略按钮、预览入口或彩色建议条');
    };
    const axis=()=>output.innerHTML.match(/data-timeline-from="[^"]+" data-timeline-to="[^"]+"/)?.[0];
    const density=()=>output.innerHTML.match(/data-reset-estimate="[^"]+" data-estimate-cdf="[^"]+"/)?.[0];
    const originalAxis=axis(),originalDensity=density();
    const rates=()=>[...output.innerHTML.matchAll(/data-phase-daily="([^"]+)"/g)].map(match=>Number(match[1]));
    const snapshots=[];
    assert.equal(fetches,1);
    checkControls();
    for(const strategy of ['keep-available','maximize','weekdays','weekend-focus']) {
      click('[data-usage-strategy]',{usageStrategy:strategy});
      assert.equal(element('#error').hidden,true,element('#error').textContent);
      assert.match(strategies.innerHTML,new RegExp(`data-usage-strategy="${strategy}" aria-pressed="true"`));
      checkControls();
      assert.equal(saved.usageStrategy,strategy);
      assert.equal(axis(),originalAxis);assert.equal(density(),originalDensity);
      assert.equal(fetches,1);
      assert.doesNotMatch(output.innerHTML,/data-node-id="backup:0"|NaN|undefined/);
      snapshots.push(rates());
    }
    assert.notDeepEqual(snapshots[0],snapshots[1]);
    assert.notDeepEqual(snapshots[1],snapshots[2]);
    click('[data-assume-reset]',{assumptionSequence:'1'});
    assert.doesNotMatch(output.innerHTML,/quota-refill-assumed-extra/);
    assert.match(strategies.innerHTML,/data-usage-strategy="weekend-focus" aria-pressed="true"/);
    checkControls();
    click('[data-toggle-forecast]');
    assert.doesNotMatch(output.innerHTML,/data-reset-density-plot|quota-refill-assumed-extra/);
    checkControls();
    assert.equal(fetches,1);
    await import('../src/web.js?usage-strategies-reload');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(fetches,2);
    assert.match(strategies.innerHTML,/data-usage-strategy="weekend-focus" aria-pressed="true"/);
    checkControls();
    assert.doesNotMatch(output.innerHTML,/data-reset-density-plot|quota-refill-assumed-extra/);
    click('[data-usage-strategy]',{usageStrategy:'balanced'});
    assert.doesNotMatch(output.innerHTML+strategies.innerHTML,/data-usage-slider/,'保持节奏也不再提供用量滑块');
    checkControls();
    await element('#calculate').listeners.click();
    assert.equal(fetches,3,'只有Calculate重新获取证据');
    checkControls();
    element('#inputs').listeners.input({target:{dataset:{field:'weeklyRemaining'},value:'101'}});
    assert.equal([...strategies.innerHTML.matchAll(/ aria-pressed="(?:true|false)" disabled/g)].length,5,
      '输入已改时不能拿旧快照切换策略');
    await element('#calculate').listeners.click();
    assert.equal(element('#error').hidden,false);
    assert.equal([...strategies.innerHTML.matchAll(/ aria-pressed="(?:true|false)" disabled/g)].length,5);
    checkControls();
  } finally {
    for(const [key,value] of Object.entries(originals)) {
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});
