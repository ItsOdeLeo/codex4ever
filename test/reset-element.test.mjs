import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderResetElement,resetAssumptionContent } from '../src/components/reset-element.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const focus={pointAt:'2026-10-20T05:30:00Z',pointHours:72,x:600,left:500,y:50,width:200,
  label:'10月20日 07:30',clockLabel:'07:30',nearbyHours:1,probability:.04,cumulativeProbability:.5,
  conditionalOn:'2026-10-17T05:30:00Z'};
const plot={startX:40,endX:800,topY:90,bottomY:154,height:64,
  cumulativeProbability:.8,tailProbability:.2,areaPath:'M 40 154 L 600 90 Z',densityPath:'M 40 154 L 600 90',bins:[]};
const fallback={normalCoincides:false,availableResetIndices:[0]};
const props=(sequence,selected)=>({sequence,plot,focus,peaks:[],guideEndY:300,timeZone:'Europe/Berlin',
  action:{id:`forecast-assumption:${sequence}`,sequence,selected,x:610,y:380,width:190,height:48,
    ...resetAssumptionContent({sequence,selected,onNoReset:fallback})},
  connectors:[{kind:'reset',path:'M 600 300 V 380'}],
  refills:selected ? [{sequence,path:'M 600 276 V 324'}] : []});

test('第二次未选按钮直接说明两次均假设，不再附加重复的首次提示',()=>{
  assert.deepEqual(resetAssumptionContent({sequence:2,selected:false,locale:'en'}),
    {title:'Assume both resets',lines:[]});
  assert.deepEqual(resetAssumptionContent({sequence:2,selected:false}),
    {title:'假设两次发布',lines:[]});
  assert.equal(resetAssumptionContent({sequence:2,selected:true,locale:'en'}).title,'Second assumed');
});

test('中英文的首次和第二次、未选和已选均由同一状态模板生成',()=>{
  for(const locale of ['en','zh-CN'])for(const sequence of [1,2])for(const selected of [false,true]) {
    const input=props(sequence,selected);
    input.locale=locale;
    Object.assign(input.action,resetAssumptionContent({sequence,selected,locale}));
    const withMetadata=renderResetElement(input,escape).html;
    delete input.action.title;
    delete input.action.lines;
    const fromState=renderResetElement(input,escape).html;
    assert.equal(fromState,withMetadata,'布局元数据和最终渲染必须共用同一份状态定义');
    assert.equal([...fromState.matchAll(/data-assume-reset /g)].length,1);
    assert.equal([...fromState.matchAll(/class="reset-action-cancel"/g)].length,selected ? 1 : 0);
  }
});

test('两条分布都省略不足1%的范围外标注，原始尾部概率和最可能标记仍保留',()=>{
  for(const sequence of [1,2])for(const tailProbability of [0,.0002,.0004,.0099,.01,.2,1]) {
    const input=props(sequence,false);
    input.plot={...plot,tailProbability,cumulativeProbability:1-tailProbability};
    const element=renderResetElement(input,escape);
    assert.equal(element.html.includes('范围外'),tailProbability>=.01);
    assert.ok(element.svg.includes(`data-tail-probability="${tailProbability}"`));
    assert.match(element.html,/data-reset-marker/);
    assert.match(element.html,/<small>累计 50%<\/small>/);
    assert.ok(element.svg.includes(`d="${plot.densityPath}"`));
  }
});

test('同一reset组件管理两次曲线、标记、操作和选中状态，样式由变量驱动',async()=>{
  for(const sequence of [1,2])for(const selected of [false,true]) {
    const input=props(sequence,selected),before=structuredClone(input);
    const element=renderResetElement(input,escape);
    assert.deepEqual(input,before,'渲染不修改规划数据');
    assert.ok(element.svg.includes(`data-reset-element="${sequence}"`));
    assert.ok(element.html.includes(`data-reset-state="${selected ? 'assumed' : 'forecast'}"`));
    assert.ok(element.html.includes(`aria-pressed="${selected}" data-assumption-sequence="${sequence}"`));
    if(selected)assert.match(element.html,/<strong>已假设(?:首次|第二次)发布<\/strong><small class="reset-action-cancel">取消假设<\/small>/);
    assert.match(element.html,/data-reset-marker/);
    assert.match(element.html,/<small>累计 50%<\/small>/);
    assert.doesNotMatch(element.html+element.svg,/每小时|\d+小时 [\d.]+%|此段 [\d.]+%/);
    assert.match(element.html,/--reset-left:500px;--reset-top:50px;--reset-width:200px/);
    assert.doesNotMatch(element.html,/style="[^"]*(?:font-size:|background:|border:|color:)/);
    assert.equal([...element.overlaySvg.matchAll(/data-refill-sequence=/g)].length,selected ? 1 : 0);
  }
  const entry=await readFile(new URL('../src/styles/theme.css',import.meta.url),'utf8');
  assert.match(entry,/@import '\.\.\/components\/reset-element.css'/,'统一入口加载组件自己的样式');
});

test('组件统一转义标签及风险文字，并保留旧的无曲线时间估计调用',()=>{
  const input=props(2,true);
  input.action.title='<img src=x onerror=alert(1)>';
  input.action.lines=['<script>oops</script>'];
  input.focus.clockLabel='<b>clock</b>';
  const result=renderResetElement(input,escape);
  assert.doesNotMatch(result.html,/<img|<script>|<b>/);
  assert.match(result.html,/&lt;img/);
  const legacy=renderResetElement({sequence:1,focus:{...focus,fromX:580,toX:620,
    fromHours:71,toHours:73,earlierProbability:.2,laterProbability:.7},guideEndY:300,timeZone:'UTC'},escape);
  assert.match(legacy.svg,/forecast-mode-range/);
  assert.match(legacy.html,/data-estimate-earlier="0.2"/);
  assert.match(legacy.html,/data-estimate-later="0.7"/);
});
