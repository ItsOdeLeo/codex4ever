import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chooseLanguage } from '../src/ui-language.js';

test('浏览器语言只匹配中英两种，手动设置优先，其他语言回退英文',()=>{
  assert.equal(chooseLanguage(), 'en');
  assert.equal(chooseLanguage({browserLanguages:['de-DE','fr-FR']}),'en');
  assert.equal(chooseLanguage({browserLanguages:['zh-TW','en-US']}),'zh-CN');
  assert.equal(chooseLanguage({browserLanguages:['fr-FR','en-AU','zh-CN']}),'en');
  assert.equal(chooseLanguage({browserLanguage:'zh-Hans-CN'}),'zh-CN');
  assert.equal(chooseLanguage({saved:'en',browserLanguages:['zh-CN']}),'en');
  assert.equal(chooseLanguage({saved:'zh-CN',browserLanguages:['en-US']}),'zh-CN');
  assert.equal(chooseLanguage({saved:'invalid',browserLanguages:['zh-HK']}),'zh-CN');
});

test('整页切换中英不重新抓取或改变分支，记住语言，英文无遗漏且公式直接可见',async()=>{
  const originals={document:globalThis.document,localStorage:globalThis.localStorage,
    fetch:globalThis.fetch,Date:globalThis.Date,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
  const NativeDate=originals.Date;
  globalThis.Date=class extends NativeDate {
    constructor(...args){super(...(args.length ? args : ['2026-10-18T12:00:00Z']));}
    static now(){return NativeDate.parse('2026-10-18T12:00:00Z');}
  };
  const browser={languages:['de-DE','en-GB'],language:'de-DE'};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:browser});
  const elements=new Map();
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',hidden:false,
      attributes:{},clientWidth:1440,classList:{add(){},remove(){}},listeners:{},contains:()=>true,
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,handler){this.listeners[name]=handler;}});
    return elements.get(selector);
  };
  const html=element('html');
  globalThis.document={querySelector:element,documentElement:html};
  const storage=new Map([['codex4ever-intensity-v1',JSON.stringify({weeklyRemaining:40,weeklyResetDays:4,
    weeklyResetHours:0,resetDates:['2026-10-19','2026-10-26']})]]);
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
  let fetches=0;
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>structuredClone(archive)};};
  const output=element('#result'),input=element('#inputs'),forecast=element('#forecast');
  const click=(container,selector,dataset)=>container.listeners.click({target:{closest:key=>key===selector ? {dataset} : null}});
  const language=value=>click(element('#language-switch'),'[data-language]',{language:value});
  const fingerprint=()=>[...output.innerHTML.matchAll(/data-(?:phase-daily|refill-sequence|timeline-from|timeline-to|reset-estimate|reset-at|bin-probability|bin-cdf)="([^"]+)"/g)].map(match=>match[0]);
  try {
    await import('../src/web.js?language-integration');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(html.attributes.lang,'en');
    assert.equal(document.title,'Codex4ever | Codex Quota & Reset Planner');
    assert.match(element('meta[name="description"]').attributes.content,/Plan OpenAI Codex usage/);
    assert.equal(element('#planner-guide').attributes.href,'/guide/');
    assert.equal(element('#calculate').textContent,'Update data');
    assert.equal(element('#creator-contact').textContent,'If you like this work, follow me on X');
    assert.match(element('#strategy-controls').innerHTML,/Updates instantly/);
    assert.equal(element('.affiliation-notice').textContent,
      'Unofficial visual usage planner for OpenAI Codex. Not affiliated with OpenAI.');
    assert.match(input.innerHTML,/Weekly quota remaining %/);
    assert.match(output.innerHTML,/Current daily usage/);
    assert.match(output.innerHTML,/data-lane-label="consumption"/);
    assert.match(output.innerHTML,/<span class="timeline-lane-text">Quota remaining<\/span>/);
    assert.match(output.innerHTML,/<span class="timeline-lane-text">Reset probability<\/span>/);
    assert.match(output.innerHTML,/<span class="timeline-lane-text">Second reset probability<\/span>/);
    assert.doesNotMatch(output.innerHTML,/At least one extra reset:/);
    assert.doesNotMatch(output.innerHTML,/\d+(?:st|nd|rd|th) reset chance:/);
    assert.match(element('#strategy-controls').innerHTML,/Use it all/);
    assert.match(element('#strategy-controls').innerHTML,/Weekdays only/);
    assert.match(element('#strategy-controls').innerHTML,/Weekend focus/);
    assert.doesNotMatch(output.innerHTML,/data-plan-mode|policy-recommendation|data-usage-strategy/);
    assert.doesNotMatch(output.innerHTML,/Auto-reset:/);
    assert.match(output.innerHTML,/aria-label="First planned reset · /);
    assert.match(output.innerHTML,/title="Second extra reset prediction · Probability density · Given 1st reset/);
    assert.match(output.innerHTML,/data-forecast-method/);
    assert.match(output.innerHTML,/data-forecast-formula/);
    assert.match(output.innerHTML,/All history · \d+ reset days/);
    assert.match(output.innerHTML,/Current campaign · \d+ complete intervals/);
    assert.doesNotMatch(output.innerHTML,/\p{Script=Han}/u);
    const method=output.innerHTML.match(/<section class="forecast-method"[\s\S]*?<\/section>/)?.[0];
    assert.match(method,/^<section[^>]*><details><summary><h3>/,'预测依据默认折叠，标题始终可见');
    assert.doesNotMatch(method,/<details open| hidden/);
    assert.doesNotMatch(forecast.innerHTML,/\p{Script=Han}/u);
    assert.match(forecast.innerHTML,/Tibo/);
    assert.equal(fetches,1);
    assert.doesNotMatch(output.innerHTML,/Customize usage|id="usage-pace-current"/);
    assert.equal([...output.innerHTML.matchAll(/data-refill-sequence="[12]"/g)].length,2,
      '两次假设保留，切语言也必须沿用');
    assert.match(output.innerHTML,/Current assumptions/);
    assert.match(output.innerHTML,/First: .* · Second:/);
    const chosen=fingerprint();
    language('zh-CN');
    assert.equal(html.attributes.lang,'zh-CN');
    assert.equal(document.title,'Codex4ever | Codex 额度与 Reset 用量规划');
    assert.match(element('meta[name="description"]').attributes.content,/根据 Codex 剩余额度/);
    assert.equal(element('#planner-guide').attributes.href,'/zh/guide/');
    assert.equal(element('#calculate').textContent,'更新数据');
    assert.equal(element('#creator-contact').textContent,'如果你喜欢这个作品，欢迎在 X 上关注我');
    assert.match(element('#strategy-controls').innerHTML,/即时更新/);
    assert.equal(element('.affiliation-notice').textContent,'OpenAI Codex 的非官方可视化用量规划工具。与 OpenAI 无隶属关系。');
    assert.match(output.innerHTML,/当前日均消耗/);
    assert.match(element('#strategy-controls').innerHTML,/不浪费额度/);
    assert.match(element('#strategy-controls').innerHTML,/周末不使用/);
    assert.match(element('#strategy-controls').innerHTML,/周末集中使用/);
    assert.doesNotMatch(output.innerHTML,/data-plan-mode|policy-recommendation|data-usage-strategy/);
    assert.match(output.innerHTML,/<span class="timeline-lane-text">剩余额度<\/span>/);
    assert.doesNotMatch(output.innerHTML,/自定义用量/);
    assert.match(output.innerHTML,/第二条曲线以首次在标记时间发生为前提/);
    assert.deepEqual(fingerprint(),chosen,'语言不能改变用量、概率、重置状态或日期范围');
    assert.equal(fetches,1,'切换语言不得重新抓取数据');
    assert.equal(storage.get('codex4ever-language'),'zh-CN');
    language('en');
    assert.deepEqual(fingerprint(),chosen);
    assert.doesNotMatch(output.innerHTML,/\p{Script=Han}/u);
    browser.languages=['zh-CN'];browser.language='zh-CN';
    await import('../src/web.js?language-manual-override');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(html.attributes.lang,'en','手动英文优先于后续系统中文');
    assert.match(output.innerHTML,/data-phase-daily="20"/,'重载后保持当前节奏，不恢复旧的加量选择');
    click(input,'button',{toggleCalendar:''});
    assert.match(input.innerHTML,/October 2026/);
    assert.match(input.innerHTML,/Previous month/);
    assert.doesNotMatch(input.innerHTML,/\p{Script=Han}/u);
    input.listeners.input({target:{dataset:{field:'weeklyRemaining'},value:'101'}});
    await element('#calculate').listeners.click();
    assert.equal(element('#error').hidden,false);
    assert.equal(element('#error').textContent,'Weekly quota remaining must be a number from 0 to 100.');
    language('zh-CN');
    assert.match(element('#error').textContent,/周额度应为/);
    await import('../src/web.js?language-chinese-reload');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(html.attributes.lang,'zh-CN');
    assert.match(output.innerHTML,/当前日均消耗/);
  } finally {
    for(const key of ['document','localStorage','fetch','Date']) {
      if(originals[key]===undefined)delete globalThis[key];else globalThis[key]=originals[key];
    }
    if(originals.navigator)Object.defineProperty(globalThis,'navigator',originals.navigator);else delete globalThis.navigator;
  }
});
