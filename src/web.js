import { chooseLanguage,supportedLanguage,LANGUAGE_STORAGE_KEY,translate,uiLocale,diagnosticText } from './ui-language.js';
import { renderForecastMethod } from './forecast-method-view.js';
import { predictionFromArchive } from './reset-forecast.js';
import { renderResetForecastSummary } from './reset-forecast-summary.js';
import { renderUsageStrategies } from './components/usage-strategies.js';
import { renderAvailabilityControls } from './components/availability-controls.js';
import { usageConsumptionSummary } from './usage-consumption-summary.js';
import { createUsagePlannerState,updateUsagePlanner,activePlannerPrediction } from './usage-planner-state.js';
import { layoutStrategyTree, renderStrategyTree } from './strategy-tree-layout.js';
import { COMPACT_TIMELINE_WIDTH } from './strategy-time-layout.js';
import { workspaceLayout } from './workspace-layout.js';
import { syncPlannerMetadata } from './page-metadata.js';
import { pluginPageClient } from './plugin-page-client.js';
import { BRAND_MARK_SVG } from './brand-mark.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const STORAGE_KEY = 'codex4ever-intensity-v1';
let savedLanguage;
try {savedLanguage=localStorage.getItem(LANGUAGE_STORAGE_KEY);}catch {/* Optional storage. */}
let language=chooseLanguage({saved:savedLanguage,
  browserLanguages:typeof navigator==='undefined' ? [] : navigator.languages,
  browserLanguage:typeof navigator==='undefined' ? undefined : navigator.language});
const t=(source,values)=>translate(language,source,values);
let statusMessage=null,lastError=null;
const setStatus=message=>{statusMessage=message;$('#status').textContent=t(message);};

function renderStaticLanguage() {
  const metadata=syncPlannerMetadata(document,language);
  document.documentElement?.setAttribute('lang',language);
  $('.brand p').textContent=metadata.intro;
  for(const [selector,label] of [['.affiliation-notice','OpenAI Codex 的非官方可视化用量规划工具。与 OpenAI 无隶属关系。'],['#github-star','GitHub'],['#follow-x','在 X 关注我'],
    ['#calculate','更新数据'],['#source-code','GitHub 开源'],['#creator-contact','如果你喜欢这个作品，欢迎在 X 上关注我'],['[data-credit-label]','重置数据来源']])
    {const element=$(selector);if(element)element.textContent=t(label);}
  $('#calculate').setAttribute?.('title',t('采用输入修改并刷新重置证据'));
  $('#planner-guide').textContent=language==='zh-CN' ? '使用说明' : 'How it works';
  $('#planner-guide').setAttribute?.('href',language==='zh-CN' ? '/zh/guide/' : '/guide/');
  for(const [selector,label] of [['.controls-panel','状态与预测'],['#inputs','算法输入'],['#forecast','预测依据'],['#output','算法输出']])
    $(selector).setAttribute?.('aria-label',t(label));
  $('#language-switch').setAttribute?.('aria-label',t('语言'));
  $('#language-switch').innerHTML=[['en','English'],['zh-CN','中文']].map(([value,label])=>
    `<button type="button" data-language="${value}" lang="${value}" aria-pressed="${language===value}">${label}</button>`).join('');
  if(statusMessage)$('#status').textContent=t(statusMessage);
  if(lastError)$('#error').textContent=diagnosticText(language,lastError,'input');
}

let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const plugin=pluginPageClient();
let pluginRevision=null,manualDraft=false;
const localDate = date => new Intl.DateTimeFormat('en-CA', { timeZone,
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const today = localDate(new Date());
let input = { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0,
  resetDates: [] };
let renderedWidth=0;
let forecastSource = { available: false, reason: '预测数据暂不可用' };
let calculationRun = 0;
let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let calendarOpen = false;
let savedPlannerPreferences;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pace-simple-input-v4'));
  if (saved) for (const key of Object.keys(input)) if (key in saved) input[key] = saved[key];
  savedPlannerPreferences=saved;
} catch { /* Corrupt local storage falls back to example values. */ }
input.weeklyRemaining = Number(input.weeklyRemaining);
input.weeklyResetDays = Number(input.weeklyResetDays);
input.weeklyResetHours = Number(input.weeklyResetHours);
if (!Number.isInteger(input.weeklyResetDays) || input.weeklyResetDays < 0 || input.weeklyResetDays > 7) input.weeklyResetDays = 2;
if (!Number.isInteger(input.weeklyResetHours) || input.weeklyResetHours < 0 || input.weeklyResetHours > 23) input.weeklyResetHours = 0;
if (input.weeklyResetDays * 24 + input.weeklyResetHours > 168) input.weeklyResetHours = 0;
input.resetDates = [...new Set((Array.isArray(input.resetDates) ? input.resetDates : []).filter(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today))].slice(0, 8);
// Plans start from the observed pace; a slider value saved by older versions is ignored.
let planner=createUsagePlannerState({timeZone,
  forecastEnabled:savedPlannerPreferences?.forecastEnabled,usageStrategy:savedPlannerPreferences?.usageStrategy,
  availabilityMode:savedPlannerPreferences?.availabilityMode,alertsEnabled:savedPlannerPreferences?.alertsEnabled});

const monthIndex = date => date.getFullYear() * 12 + date.getMonth();
const monthDistance = () => monthIndex(visibleMonth) - monthIndex(new Date());

function calendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const first = new Date(year, month, 1);
  const monthLabel=new Intl.DateTimeFormat(uiLocale(language),{year:'numeric',month:'long'}).format(first);
  const blanks = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const maxDate = localDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 365));
  const dates = Array.from({ length: blanks }, () => '<span class="empty-day"></span>');
  for (let day = 1; day <= count; day++) {
    const date = localDate(new Date(year, month, day));
    const backup = input.resetDates.includes(date);
    const disabled = date < today || date > maxDate;
    dates.push(`<button type="button" data-calendar-date="${date}" aria-label="${date}${backup ? t('，备用 reset 到期日') : ''}" aria-pressed="${backup}" ${disabled ? 'disabled' : ''}>${day}</button>`);
  }
  return `<div class="reset-actions"><div class="calendar-summary">${input.resetDates.length ? input.resetDates.slice().sort().map(date => `<button type="button" data-remove-date="${escape(date)}" aria-label="${escape(t('移除备用 reset {date}',{date}))}">${escape(date)} ×</button>`).join('') : ''}</div>
    <button type="button" data-toggle-calendar aria-expanded="${calendarOpen}" aria-controls="reset-calendar">${t(calendarOpen ? '收起日历' : '＋ 添加日期')}</button></div>
  ${calendarOpen ? `<div class="calendar-panel" id="reset-calendar">
    <div class="calendar-head"><strong>${monthLabel}</strong><div><button type="button" data-month-nav="-1" aria-label="${t('上个月')}" ${monthDistance() <= 0 ? 'disabled' : ''}>‹</button><button type="button" data-month-nav="1" aria-label="${t('下个月')}" ${monthDistance() >= 11 ? 'disabled' : ''}>›</button></div></div>
    <div class="month-grid" role="group" aria-label="${t('{month}备用 reset 到期日历',{month:monthLabel})}">${(uiLocale(language)==='zh-CN' ? ['一','二','三','四','五','六','日'] : ['M','T','W','T','F','S','S']).map(day => `<span class="weekday">${day}</span>`).join('')}${dates.join('')}</div>
    <p class="hint">${t('点日期添加或取消；同一天最多一个，到期按当天结束估算。')}</p>
  </div>` : ''}`;
}

function delayControl(field, label, unit, max) {
  return `<div class="delay-control"><button type="button" data-delay-step="${field}" data-delta="-1" aria-label="${t('减少{label}',{label:t(label)})}">−</button><input type="number" data-field="${field}" aria-label="${t(label)}" min="0" max="${max}" step="1" value="${escape(input[field])}"><span>${t(unit)}</span><button type="button" data-delay-step="${field}" data-delta="1" aria-label="${t('增加{label}',{label:t(label)})}">＋</button></div>`;
}

function renderInputs() {
  $('#inputs').innerHTML = `<div class="compact-form">
    <fieldset class="calendar-field"><legend>${t('备用 reset · {count} 个',{count:input.resetDates.length})}</legend>${calendar()}</fieldset>
    <fieldset class="simple-fields"><legend>${t('当前状态')}</legend>
      <label for="weekly-remaining">${t('本周额度还剩多少 %')}</label><input id="weekly-remaining" data-field="weeklyRemaining" type="number" min="0" max="100" step="any" value="${escape(input.weeklyRemaining)}">
      <div class="refresh-row"><div class="refresh-label">${t('正常刷新还有')}</div><div class="delay-controls">${delayControl('weeklyResetDays', '正常刷新剩余天数', '天', 7)}${delayControl('weeklyResetHours', '正常刷新剩余小时', '小时', 23)}</div></div>
    </fieldset>
  </div>`;
}

function markChanged() {
  manualDraft=true;
  calculationRun++;
  setStatus('已修改，请更新数据');
  $('#result').classList.add('stale');
  planner=updateUsagePlanner(planner,{type:'invalidate'});
  renderStrategyControls();
}

function renderStrategyControls() {
  $('#strategy-controls').innerHTML=`<div class="control-heading"><h3 id="strategy-controls-title">${t('用量策略')}</h3><span class="instant-label">${t('即时更新')}</span></div>${renderUsageStrategies({
    selected:planner.intent.usageStrategy,locale:language,disabled:!planner.result?.available,
    // Cautious / optimistic belong to keep available: show them right under it.
    after:planner.intent.usageStrategy==='keep-available' ? {'keep-available':renderAvailabilityControls(
      planner.result?.recommendation?.availability ? {...planner.result.recommendation.availability,timeZone} : null,
      {locale:language,mode:planner.intent.availabilityMode,alertsEnabled:planner.intent.alertsEnabled,disabled:!planner.result?.available},escape)} : {}},escape)}`;
}

function saveInput() {
  if(plugin&&!manualDraft)return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({...input,
    forecastEnabled:planner.intent.forecastEnabled,
    usageStrategy:planner.intent.usageStrategy,availabilityMode:planner.intent.availabilityMode,alertsEnabled:planner.intent.alertsEnabled})); }
  catch { /* Local storage is optional. */ }
}

const round = value => Number(value.toFixed(1));
const MOBILE_TIMELINE_WIDTH=640;
// Cards people screenshot carry the name, so a cropped image still says where it came from.
const BRAND_STAMP=`<div class="brand-stamp" aria-hidden="true"><span>${BRAND_MARK_SVG}</span> Codex4ever</div>`;

function renderResult(availableWidth=$('#result').clientWidth) {
  const result=planner.result;
  if(!result)return;
  const planningPrediction=activePlannerPrediction(planner),planningNow=new Date(planner.snapshot.now);
  $('#result').classList.remove('stale');
  const workspace=workspaceLayout(availableWidth);
  renderedWidth=workspace.width;
  const forecastSummary = renderResetForecastSummary({ source: forecastSource, prediction: planningPrediction,
    timeZone, now: planningNow,locale:language });
  $('#forecast').innerHTML = `<div class="forecast-control" ${planningPrediction ? `data-forecast-48-probability="${planningPrediction.next48Probability}"` : ''}><span>${t('额外重置预测')}</span><button type="button" data-toggle-forecast aria-pressed="${!!planningPrediction}" ${!forecastSource.available ? 'disabled' : ''}>${t(planningPrediction ? '已开启' : '已关闭')}</button></div>${forecastSummary}${BRAND_STAMP}`;
  renderStrategyControls();
  if (!result.available) {
    $('#result').innerHTML = `<p class="empty-result">${escape(diagnosticText(language,result.reason,'input'))}</p>`;
    return;
  }
  const graph = layoutStrategyTree(result, { expandedLevel: null, prediction: planningPrediction,
    // Phones fit the whole horizon to the screen (lane names move above their
    // rows); mid widths keep a wider canvas that scrolls sideways.
    viewportWidth:availableWidth<COMPACT_TIMELINE_WIDTH ? workspace.timelineWidth
      : Math.max(workspace.timelineWidth,availableWidth<680 ? MOBILE_TIMELINE_WIDTH : 0),
    displayEndHours:planner.displayEndHours,locale:language });
  const consumption=usageConsumptionSummary(result,{locale:language});
  const policyData=result.recommendation ? ` data-policy-search="${result.recommendation.method}"${result.recommendation.primary ? ' data-plan-basis="predicted-extra-resets-first"' : ''}` : '';
  $('#result').innerHTML = `<section class="strategy-panel" aria-label="${t('用量计划')}"${policyData} style="--panel-padding:${workspace.panelPadding}px">${graph.compact ? phoneSummary(graph,planningPrediction) : ''}<div class="pace-controls"><div data-current-consumption data-daily="${consumption.dailyPercent}"><span>${t('当前日均消耗 {daily}%',{daily:round(consumption.dailyPercent)})}</span></div>
    </div>
    ${result.recommendation&&!result.recommendation.primary ? `<div class="timeline-toolbar"><span>${t('若始终没有额外重置')}</span></div>` : ''}
    ${renderStrategyTree(graph, escape)}
    </section>
    ${renderForecastMethod({source:forecastSource,prediction:planningPrediction,result,timeZone,locale:language},escape)}`;
}

// Phones: only what the timeline below does not already say, plus a jump to the inputs.
function phoneSummary(graph,prediction) {
  const focus=prediction&&graph.forecastFocus;
  const cells=[
    focus ? `<div data-summary="next-reset"><small>${escape(t('下次额外 reset'))}</small><strong>${escape(focus.label)}</strong></div>` : '',
    Number.isFinite(prediction?.next48Probability) ? `<div data-summary="next-48h"><small>${escape(t('未来 48 小时'))}</small><strong>${round(prediction.next48Probability*100)}%</strong></div>` : ''
  ].filter(Boolean).join('');
  return `<div class="phone-summary" data-phone-summary>${cells}<button type="button" data-edit-quota>${escape(t('修改额度'))}</button>${BRAND_STAMP}</div>`;
}

function dispatchPlanning(action) {
  planner=updateUsagePlanner(planner,action);
  renderResult();
}

async function bundledPrediction(now) {
  // Local server → snapshot precomputed by the static site build → bundled archive.
  // A static host may answer a missing path with the HTML page and status 200,
  // so only a parsed JSON archive counts; anything else falls through.
  const local=!globalThis.location||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location.hostname);
  const paths=['/api/reset-evidence','/data/reset-evidence.json','/experiments/public-reset-events.json'].slice(local ? 0 : 1);
  for(const path of paths) {
    let archive=null;
    try {
      const response=await fetch(path);
      if(response.ok)archive=await response.json();
    } catch { archive=null; }
    if(Array.isArray(archive?.events))return predictionFromArchive({ archive, now, timeZone });
  }
  return { available: false, reason: '历史数据加载失败，暂不预测' };
}

async function calculate() {
  const run = ++calculationRun;
  $('#error').hidden = true;
  lastError=null;
    setStatus('更新重置证据…');
  try {
    if(plugin&&!manualDraft) {
      const update=await plugin.refresh({timeZone,language,usageStrategy:planner.intent.usageStrategy,
        paceMultiplier:planner.intent.targetMultiplier,forecastEnabled:planner.intent.forecastEnabled,
        availabilityMode:planner.intent.availabilityMode,alertsEnabled:planner.intent.alertsEnabled});
      if(run===calculationRun)importPluginPlan(update);
      return;
    }
    const now = new Date();
    let publicForecast = { available: false, reason: '预测数据暂不可用' };
    try { publicForecast = await bundledPrediction(now); } catch { /* Keep the known-resource plan. */ }
    if (run !== calculationRun) return;
    forecastSource = publicForecast;
    planner=updateUsagePlanner(planner,{type:'new-snapshot',input,now,prediction:publicForecast.prediction});
    renderResult();
    setStatus('已计算');
    saveInput();
  } catch (error) {
    if (run !== calculationRun) return;
    planner=updateUsagePlanner(planner,{type:'invalidate'});
    $('#result').classList.add('stale');
    renderStrategyControls();
    lastError=error.message;
    $('#error').textContent=diagnosticText(language,lastError,'input');
    $('#error').hidden = false;
    setStatus('请检查输入');
  }
}

function importPluginPlan({revision,session}) {
  if(!session)return;
  planner=updateUsagePlanner(planner,{type:'import-mcp-plan',session});
  pluginRevision=revision;manualDraft=false;timeZone=planner.timeZone;
  if(!savedLanguage&&supportedLanguage(session.language))language=session.language;
  input=structuredClone(planner.snapshot.input);
  forecastSource=session.forecastSource;
  lastError=null;$('#error').hidden=true;
  renderStaticLanguage();renderInputs();renderResult();
  setStatus(language==='zh-CN' ? '已连接本地 MCP' : 'Connected to local MCP');
}

async function startPluginPage() {
  try {
    const update=await plugin.read();
    importPluginPlan(update.session ? update : await plugin.refresh());
  }catch(error){
    $('#error').hidden=false;$('#error').textContent=error.message;
    setStatus(language==='zh-CN' ? '请从 Codex 重新打开规划页' : 'Reopen the planner from Codex');
  }
  // Poll only the in-memory result revision, never the account or public sites.
  const poll=async()=>{
    try {if(!document.hidden) {
      const update=await plugin.read(pluginRevision);
      if(update.session&&update.revision!==pluginRevision)importPluginPlan(update);
    }}catch {setStatus(language==='zh-CN' ? 'MCP 已断开 · 当前为上次结果' : 'MCP disconnected · Last snapshot');}
    setTimeout(poll,5000);
  };
  setTimeout(poll,5000);
}

$('#inputs').addEventListener('input', event => {
  const field = event.target.dataset.field;
  if (!Object.hasOwn(input,field)) return;
  input[field] = event.target.value === '' ? NaN : Number(event.target.value);
  markChanged();
});

$('#inputs').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !$('#inputs').contains(button)) return;
  const data = button.dataset;
  if (data.delayStep) {
    const total = input.weeklyResetDays * 24 + input.weeklyResetHours + Number(data.delta) * (data.delayStep === 'weeklyResetDays' ? 24 : 1);
    if (Number.isInteger(total) && total >= 1 && total <= 168) {
      input.weeklyResetDays = Math.floor(total / 24);
      input.weeklyResetHours = total % 24;
      renderInputs();
      markChanged();
    }
    return;
  }
  if (data.toggleCalendar !== undefined) calendarOpen = !calendarOpen;
  else if (data.monthNav) visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + Number(data.monthNav), 1);
  else if (data.calendarDate) {
    const index = input.resetDates.indexOf(data.calendarDate);
    if (index >= 0) input.resetDates.splice(index, 1);
    else {
      if (input.resetDates.length >= 8) { setStatus('最多选择 8 个备用 reset 日期'); return; }
      input.resetDates.push(data.calendarDate);
    }
    calendarOpen = false;
  } else if (data.removeDate) input.resetDates = input.resetDates.filter(date => date !== data.removeDate);
  else return;
  renderInputs();
  if (!data.monthNav && data.toggleCalendar === undefined) markChanged();
});

$('#calculate').addEventListener('click', calculate);
function handlePlanClick(event) {
  if(event.target.closest('[data-edit-quota]')) {
    document.querySelector('.input-state')?.scrollIntoView?.({block:'start'});return;
  }
  if (!planner.result) return;
  const availability=event.target.closest('button[data-availability-mode]');
  if(availability) {
    dispatchPlanning({type:'set-availability-mode',mode:availability.dataset.availabilityMode});
    saveInput();return;
  }
  if(event.target.closest('[data-toggle-pace-alerts]')) {
    dispatchPlanning({type:'toggle-alerts'});saveInput();return;
  }
  const strategy=event.target.closest('[data-usage-strategy]');
  if(strategy) {
    dispatchPlanning({type:'set-strategy',strategy:strategy.dataset.usageStrategy});
    saveInput();return;
  }
  if (event.target.closest('[data-toggle-forecast]')) {
    dispatchPlanning({type:'toggle-forecast'});
    saveInput();
    return;
  }
  const assumptionButton=event.target.closest('[data-assume-reset]');
  if(assumptionButton) {
    dispatchPlanning({type:'toggle-assumption',sequence:assumptionButton.dataset.assumptionSequence});
    return;
  }
  const backup = event.target.closest('[data-backup-choice]');
  if (backup) {
    dispatchPlanning({type:'toggle-bank',index:backup.dataset.backupChoice});
    return;
  }
}
$('#result').addEventListener('click',handlePlanClick);
$('#strategy-controls').addEventListener('click',handlePlanClick);
$('#forecast').addEventListener('click',handlePlanClick);
const resizeResult=width=>{
  if(planner.result&&width>0&&Math.abs(width-renderedWidth)>=2)renderResult(width);
};
if(typeof ResizeObserver==='function')new ResizeObserver(entries=>{
  const width=Math.round(entries[0]?.contentRect.width??0);
  resizeResult(width);
}).observe($('#result'));
if(typeof window!=='undefined')window.addEventListener('resize',()=>resizeResult($('#result').clientWidth));
// Keep lane labels in view while a scrollable timeline moves underneath them.
$('#result').addEventListener?.('scroll',event=>{
  const scroller=event.target;
  if(!scroller.classList?.contains('tree-scroll'))return;
  const shift=scroller.scrollLeft ? `translateX(${scroller.scrollLeft}px)` : '';
  const labels=scroller.querySelectorAll('.timeline-lane-label');
  let cover=scroller.querySelector('.lane-cover');
  if(!cover&&labels.length) {
    cover=document.createElement('div');cover.className='lane-cover';
    cover.style.width=`${labels[0].offsetLeft+labels[0].offsetWidth+8}px`;
    scroller.querySelector('.strategy-graph')?.prepend(cover);
  }
  if(cover){cover.hidden=!shift;cover.style.transform=shift;}
  for(const label of labels)label.style.transform=shift;
},true);
$('#language-switch').addEventListener('click',event=>{
  const button=event.target.closest('[data-language]');
  const selected=supportedLanguage(button?.dataset.language);
  if(!selected||selected===language)return;
  language=selected;
  savedLanguage=selected;
  try {localStorage.setItem(LANGUAGE_STORAGE_KEY,language);}catch {/* Optional storage. */}
  renderStaticLanguage();
  renderInputs();
  if(planner.result)renderResult();
  else {
    renderStrategyControls();
    $('#result').innerHTML=t(statusMessage==='已修改，请重新计算' ? statusMessage : '点击「计算策略」查看结果。');
  }
});
renderStaticLanguage();
renderStrategyControls();
$('#result').innerHTML=t('点击「计算策略」查看结果。');
renderInputs();
if(plugin)startPluginPage();else calculate();
