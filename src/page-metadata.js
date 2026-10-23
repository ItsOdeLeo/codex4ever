/** Shared by the initial HTML and language switch; no planning state. */
export const PLANNER_METADATA={
  en:{
    title:'Usage Planner | Codex Quota & Reset Planner',
    description:'Plan OpenAI Codex usage with quota depletion estimates, banked reset deadlines and extra reset forecasts. Compare daily usage strategies locally or through MCP.',
    intro:'Plan Codex quota, banked resets and extra reset forecasts, right in your browser.',
    locale:'en_GB'
  },
  'zh-CN':{
    title:'赛博牛马规划器 | Codex 额度与 reset 规划工具',
    description:'赛博牛马规划器（Usage Planner）帮你规划 Codex 每周额度：按现在的速度哪天用完、额外 reset 大概什么时候来、备用 reset 什么时候值得用，再算出每天用多少。免费开源，也能装成 Codex 插件。',
    intro:'规划 Codex 用量、备用 reset 与额外 reset，全部在浏览器里计算。',
    locale:'zh_CN'
  }
};

export function syncPlannerMetadata(document,language) {
  const meta=PLANNER_METADATA[language]??PLANNER_METADATA.en;
  document.title=meta.title;
  for(const [selector,value] of [
    ['meta[name="description"]',meta.description],
    ['meta[property="og:title"]',meta.title],
    ['meta[property="og:description"]',meta.description],
    ['meta[property="og:locale"]',meta.locale],
    ['meta[name="twitter:title"]',meta.title],
    ['meta[name="twitter:description"]',meta.description]
  ])document.querySelector(selector)?.setAttribute?.('content',value);
  // Canonical URLs belong to the server route, not browser language or state.
  return meta;
}
