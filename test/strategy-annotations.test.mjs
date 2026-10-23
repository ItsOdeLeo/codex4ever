import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPhaseControl } from '../src/components/strategy-annotations.js';
import { resetOpportunityLayout } from '../src/components/reset-element.js';

test('阶段标注只保留日均及有截止含义的概率，中英都不重复状态或生成调节控件',()=>{
  const phase={phaseIndex:1,startAt:'2026-10-18T12:00:00Z',dailyPercent:22.7,
    baselineDailyPercent:22.7,reason:'inherited-user-pace',fixed:true,constrained:false,
    x:10,y:20,width:198,nextResetOpportunity:{boundaryKind:'backup',until:'2026-10-22T04:00:00Z',
      probability:.837,nextExtraResetSequence:1}};
  const before=structuredClone(phase);
  for(const [locale,rate,probability,until] of [['en','22.7% / day','At least one extra reset: 83.7%','by 22 Oct, 04:00'],
    ['zh-CN','22.7% / 天','至少一次额外 reset：83.7%','10/22 04:00之前']]) {
    const html=renderPhaseControl(phase,{timeZone:'UTC',escape:String,locale});
    assert.ok(html.includes(rate));
    assert.ok(html.includes(probability));
    assert.ok(html.includes(until),'直接显示概率的截止时刻，不再借用备用这个动作名');
    assert.doesNotMatch(html,/<input|<button|data-usage-slider|Keep current usage|Daily usage:|another reset|before backup|用备用前|保持当前|自选用量/);
    assert.ok(html.includes('data-probability="0.837"'),'缩短文案不改变底层概率');
  }
  assert.deepEqual(phase,before);
});

test('横向窄阶段只有数值，建议、单位与暂停文字不重复挤进各段',()=>{
  for(const locale of ['en','zh-CN'])for(const dailyPercent of [0,22.7,34]) {
    const phase={startAt:'2026-10-18T12:00:00Z',dailyPercent,baselineDailyPercent:22.7,
      fixed:dailyPercent===22.7,constrained:false,reason:dailyPercent ? 'quota' : 'no-resource',
      quotaLabel:true,x:100,y:20,width:36};
    const html=renderPhaseControl(phase,{timeZone:'UTC',escape:String,locale});
    const value=html.match(/<strong[^>]*>([^<]+)<\/strong>/)?.[1];
    assert.equal(value,`${dailyPercent}%`);
    assert.doesNotMatch(value,/Suggested|usage|day|建议|用量|天|Paused|暂停/);
  }
});

test('各阶段均表示至少一次额外 reset，不把条件下的下一次标为第一二三次',()=>{
  for(const locale of ['en','zh-CN'])for(const width of [36,100])for(const sequence of [1,2,3]) {
    const phase={startAt:'2026-10-20T00:30:00Z',dailyPercent:34,baselineDailyPercent:17,
      fixed:false,quotaLabel:true,x:10,y:20,width,
      nextResetOpportunity:{until:'2026-10-22T00:30:00Z',probability:.196,
        nextExtraResetSequence:sequence,previousExtraResetAt:sequence>1 ? '2026-10-20T00:30:00Z' : null}};
    const before=structuredClone(phase);
    const html=renderPhaseControl(phase,{timeZone:'Europe/Berlin',escape:String,locale});
    const layout=resetOpportunityLayout(width);
    assert.match(html,/data-probability="0.196"/);
    assert.ok(html.includes(`data-next-extra-sequence="${sequence}"`),'序号只保留为内部预测来源');
    assert.ok(html.includes(locale==='en' ? 'At least one extra reset: 19.6%' : '至少一次额外 reset：19.6%'));
    assert.doesNotMatch(html,/\b(?:1st|2nd|3rd|first|second|third)\b|第[123]次/i);
    const content=html.match(/data-cutoff-layout="[^"]+"[^>]*>([\s\S]*?)<\/small>/)?.[1];
    assert.ok(content);
    const visible=content.replace(/<[^>]+>/g,'');
    assert.doesNotMatch(visible,/reset chance|重置概率|\bby\b|之前|\bat\b/);
    assert.ok(visible.includes('19.6%'));
    assert.ok(visible.includes('02:30'),'使用当地钟点');
    assert.ok(visible.includes(locale==='en' ? '22/10' : '10/22'));
    assert.ok(html.includes(`data-cutoff-layout="${width<80 ? 'stacked' : 'inline'}"`));
    assert.ok(html.includes(`--phase-label-height:${36+layout.height}px`));
    assert.deepEqual(phase,before);
  }
});
