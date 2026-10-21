import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { workspaceLayout } from '../src/workspace-layout.js';
import { predictReset } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree } from '../src/strategy-tree-layout.js';
import { activePaletteSource,paletteValue } from './helpers/theme-source.mjs';

test('策略区始终使用实际可用宽度，不用最小图宽把窄窗口撑开',()=>{
  for(const width of [300,340,480,640,760,1024,1280,1920,2560]) {
    const layout=workspaceLayout(width);
    const used=layout.timelineWidth+layout.panelPadding*2+2;
    assert.equal(used,width);
  }
  assert.ok(workspaceLayout(2560).timelineWidth>workspaceLayout(1920).timelineWidth);
  assert.ok(workspaceLayout(1920).timelineWidth>1100);
});

test('输入和预测共用紧凑侧栏，结果独占右侧；窄屏保留计划和证据',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const css=await readFile(new URL('../src/styles/base.css',import.meta.url),'utf8');
  const sidebar=html.match(/<aside class="controls-panel"[\s\S]*?<\/aside>/)?.[0];
  assert.match(sidebar,/id="inputs"/);
  assert.match(sidebar,/id="calculate"/);
  assert.ok(sidebar.indexOf('id="calculate"')<sidebar.indexOf('id="strategy-controls"'),
    '更新数据跟随状态输入，不能在策略后充当提交按钮');
  assert.match(sidebar,/<div class="input-update">\s*<button id="calculate" type="button"/);
  assert.doesNotMatch(sidebar,/<button id="calculate"[^>]*class="primary"/);
  assert.match(sidebar,/<div class="toolbar">\s*<section id="strategy-controls"[^>]+><\/section>\s*<\/div>/,
    '策略是唯一的即时调整区，不再有用量滑块');
  assert.match(html,/<a id="creator-contact" href="https:\/\/x\.com\/ItsOdeLeo"/);
  assert.match(sidebar,/id="forecast"/);
  assert.doesNotMatch(sidebar,/id="output"/);
  assert.match(css,/\.layout\{[^}]*grid-template-columns:300px minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/planning-workspace|--forecast-width/);
  assert.match(css,/@media\(max-width:960px\)/);
  assert.match(css,/#output\{width:100%;order:0\}/,'窄屏时间轴排最前');
  assert.match(css,/\.forecast-panel\{width:100%;order:2/);
  assert.match(css,/@media\(max-width:960px\)\{[^}]*\}#output\{order:0[;}]/,'Codex 侧边面板宽度下时间轴排最前');
});

test('样式单入口实际导入配色、基础排版、reset组件和材质，颜色只在配色文件中定义',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(links,['/src/styles/theme.css']);
  const loaded=new Map(),visiting=new Set();
  async function visit(url) {
    assert.ok(!visiting.has(url.href),'样式导入不能形成循环');
    if(loaded.has(url.href))return;
    visiting.add(url.href);
    const css=await readFile(url,'utf8');
    for(const match of css.matchAll(/@import\s+['"]([^'"]+)['"];?/g))await visit(new URL(match[1],url));
    visiting.delete(url.href);
    loaded.set(url.href,css);
  }
  await visit(new URL('..'+links[0],import.meta.url));
  assert.equal(loaded.size,5);
  const palette=[...loaded.entries()].filter(([url])=>url.includes('/palettes/'));
  assert.equal(palette.length,1,'只启用当前一份配色，不叠加多份色值');
  const combined=[...loaded.values()].join('\n');
  const declared=new Set([...combined.matchAll(/(--[\w-]+)\s*:/g)].map(match=>match[1]));
  const positions=new Set(['--panel-padding','--reset-left','--reset-top','--reset-width','--reset-height','--phase-label-height']);
  for(const match of combined.matchAll(/var\(\s*(--[\w-]+)/g))
    assert.ok(declared.has(match[1])||positions.has(match[1]),`缺少变量定义 ${match[1]}`);
  for(const [url,css] of loaded)if(!url.includes('/palettes/'))
    assert.doesNotMatch(css,/#[\da-f]{3,8}\b|(?:rgb|rgba|hsl|hsla)\(\s*\d/i,`色值散落在 ${url}`);
  assert.match(combined,/\.time-day\{position:absolute;top:0/,'入口包含顶部日期定位样式');
  assert.match(combined,/\.reset-element\s*\{/,'入口包含reset组件样式');
});

test('当前主题使用全宽容器，主文字及操作颜色对画布和两级面板达到4.5对比度',async()=>{
  const css=await readFile(new URL('../src/styles/base.css',import.meta.url),'utf8');
  const palette=await activePaletteSource();
  const token=name=>paletteValue(palette,name);
  const luminance=color=>{
    const rgb=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255)
      .map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  for(const background of ['canvas','surface','surface-soft'])for(const foreground of ['ink','muted','accent-text','quota-text','forecast-first-text','forecast-second-text','warning-text','danger-text']) {
    const a=luminance(token(background)),b=luminance(token(foreground));
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${foreground} on ${background}`);
  }
  assert.match(css,/main\{[^}]*width:100%;max-width:none/);
  assert.doesNotMatch(css,/max-width:660px|width:min\(760px/);
});

test('当前配色的全部基础色都在对应来源记录中，三组曲线保持独立颜色',async()=>{
  const entry=new URL('../src/styles/theme.css',import.meta.url);
  const source=await readFile(entry,'utf8');
  const palettePath=source.match(/@import ['"](\.\/palettes\/[^'"]+\.css)['"]/)?.[1];
  assert.ok(palettePath);
  const palette=await activePaletteSource();
  const manifest=palette.match(/([\w-]+\.(?:samples|source)\.json)/)?.[1];
  assert.ok(manifest,'配色注明自己的图片取样或设计系统来源记录');
  const samples=JSON.parse(await readFile(new URL(manifest,new URL(palettePath,entry)),'utf8'));
  const allowed=new Set(Object.values(samples.colors).map(color=>color.hex));
  const literals=[...palette.matchAll(/#[\da-f]{6}\b/gi)].map(match=>match[0].toUpperCase());
  assert.ok(literals.length>0);
  for(const color of literals)assert.ok(allowed.has(color),`存在来源记录之外的颜色 ${color}`);
  assert.equal(new Set(['forecast-first-curve','forecast-second-curve','quota-stroke']
    .map(name=>paletteValue(palette,name))).size,3);
});
