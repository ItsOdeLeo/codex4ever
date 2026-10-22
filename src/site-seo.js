import { PLANNER_METADATA } from './page-metadata.js';
import { BRAND_MARK_SVG } from './brand-mark.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
// codex-resets.com asks for a linked credit wherever its data is shown.
// Public by design: IndexNow verifies site ownership by fetching /<key>.txt.
export const INDEXNOW_KEY='98f3b4121e21dd55fee643d8af3a1002';
export const SOURCE_URL='https://github.com/ItsOdeLeo/codex4ever';
export const CREATOR_URL='https://x.com/ItsOdeLeo';
export const DATA_SOURCES=[['Codex Resets','https://codex-resets.com']];
const guides={
  en:{path:'/guide/',title:'Codex Usage, Quota & Reset Planning Guide | Codex4ever',
    description:'Learn how Codex4ever estimates quota depletion, compares banked and extra resets, and plans daily Codex usage with a local MCP interface.',
    heading:'Plan your Codex usage',back:'Open the planner',
    intro:'Codex4ever is an unofficial usage planner for OpenAI Codex. It compares how long your remaining quota can last, when a banked reset may help, and how possible extra resets affect your plan.',
    sections:[
      ['Start with your current quota','Enter your weekly quota remaining, the time until your normal refresh, and the expiry dates of any banked resets. The planner estimates daily consumption from the quota used and elapsed time in the seven-day window. You can adjust usage and compare when it would run out.'],
      ['Compare usage strategies','Keep your current pace, use it all before the next refill, work on weekdays only, or focus on the weekend. The timeline shows remaining quota, actual projected depletion, waiting periods and planned refills. A forecast that can cover usage takes priority over spending a banked reset; limited banked resets retain value as a fallback.'],
      ['Understand extra reset forecasts','Historical public reset announcements inform the interval model and usual posting times. Current campaign history and available Tibo posts or replies can affect the forecast. The first curve predicts the next extra reset. The second is conditional on the first happening at its marked time. Cumulative probability means the chance of an event by a given time, not a promise that your account will refresh.'],
      ['Explore assumptions, then recalculate','Assuming a release lets you inspect a possible refill and the daily usage leading up to it. Each simulated reset starts a new seven-day window in this model. After an actual reset, check your account and recalculate from the observed quota and refresh time. The model is experimental and its probabilities are not calibrated guarantees.'],
      ['Use the same planner through MCP','The local MCP server exposes public reset evidence and usage planning tools to Codex or another MCP host. The host can analyze posts and pass structured evidence to the planner. Standalone use can instead connect a standard LLM API. The core calculation works without either option.'],
      ['Keep control of your account','The website calculates your plan in your browser. It fetches public evidence without sending your quota inputs. The local MCP can read usage from a locally signed-in Codex account when requested. Neither interface redeems a reset or spends credits for you.']
    ],
    source:'Open source on GitHub',
    credit:'Reset data',
    faqHeading:'Frequently asked questions',
    faq:[
      ['Is Codex4ever affiliated with OpenAI?','No. Codex4ever is an unofficial, MIT-licensed planner built by an independent developer. It is not affiliated with or endorsed by OpenAI.'],
      ['Does the website send my quota to a server?','No. The website calculates your plan in your browser. It only downloads public reset evidence, and your quota inputs never leave the page.'],
      ['Does Codex4ever redeem banked resets or spend credits?','No. It only recommends a daily usage rate and shows when a banked reset could help. You decide whether to redeem anything in Codex.'],
      ['How are extra resets forecast?','The forecast uses public historical reset announcements, the current reset campaign and public posts by Tibo of the OpenAI Codex team. Its probabilities are experimental estimates, not guarantees that your account will refresh.'],
      ['How do I use Codex4ever inside Codex?','Install the plugin with: codex plugin marketplace add ItsOdeLeo/codex4ever, then codex plugin add codex4ever@codex4ever. Start a new chat and ask Codex to plan your usage from your current quota. It reads your local, signed-in quota and needs no separate API key.']
    ],
    notice:'Unofficial visual usage planner for OpenAI Codex. Not affiliated with OpenAI.'},
  'zh-CN':{path:'/zh/guide/',title:'Codex 用量、额度与 Reset 规划指南 | Codex4ever',
    description:'了解 Codex4ever 如何估算额度耗尽时间、比较备用与额外 reset，并通过本地 MCP 规划日均 Codex 用量。',
    heading:'规划你的 Codex 用量',back:'打开规划器',
    intro:'Codex4ever 是 OpenAI Codex 的非官方用量规划器。它比较当前额度还能用多久、何时可能需要备用 reset，以及额外重置预测对用量安排的影响。',
    sections:[
      ['从当前额度开始','填写本周剩余额度、距离正常刷新的时间，以及备用 reset 的到期日期。规划器根据七天窗口中已消耗的额度和已经过去的时间估算日均消耗。你可以调整用量，比较预计在哪个时间耗尽。'],
      ['比较使用策略','支持保持当前用量、不浪费额度（在下次补满前用完）、仅工作日使用和周末集中使用。时间轴展示剩余额度、实际预计耗尽点、停用空档和规划中的补充。预测额外重置能够覆盖用量时优先考虑该补充，保留有限的备用 reset 作为后路。'],
      ['理解额外重置预测','公开历史 reset 公告用于估计间隔分布和常见发布钟点。当前活动内的历史，以及可获取的 Tibo 帖子和回复，也会影响预测。第一条曲线预测下次额外 reset；第二条以首次在标记时刻发生为条件。累计概率表示截至某个时间发生事件的可能性，不保证个人账户一定刷新。'],
      ['查看假设，再按实际情况重算','假设发布后，可以查看恢复额度的情景，以及此前各段的建议日均用量。模型中每次模拟 reset 都会重新开始七天窗口。实际发生 reset 后，需要核对账户余额和刷新时间，再重新计算。模型仍处于实验阶段，概率尚未校准。'],
      ['通过 MCP 使用同一套规划器','本地 MCP 服务向 Codex 等宿主提供公开 reset 证据和策略工具。宿主可以分析帖子，将结构化证据交给规划器；独立运行时也可以连接标准 LLM API。不连接模型也能使用核心计算。'],
      ['账户由你控制','网页在浏览器内计算计划，获取公开证据时不会发送你填写的额度。本地 MCP 可在请求时读取本机已登录 Codex 的用量。两个入口都不会自动兑换 reset 或消耗 credits。']
    ],
    source:'GitHub 开源',
    credit:'重置数据来源',
    faqHeading:'常见问题',
    faq:[
      ['Codex4ever 是 OpenAI 官方的吗？','不是。Codex4ever 是独立开发者制作的非官方规划器，以 MIT 协议开源，与 OpenAI 无隶属或背书关系。'],
      ['网页会把我的额度发送到服务器吗？','不会。网页在浏览器内计算计划，只下载公开的 reset 证据，你填写的额度不会离开页面。'],
      ['Codex4ever 会自动兑换备用 reset 或消耗 credits 吗？','不会。它只建议日均用量，并显示备用 reset 何时可能有用。是否兑换由你在 Codex 中决定。'],
      ['额外 reset 是怎么预测的？','预测依据公开的历史 reset 公告、当前 reset 活动，以及 OpenAI Codex 团队 Tibo 的公开帖子。概率是实验性估计，不保证个人账户一定刷新。'],
      ['怎样在 Codex 里使用 Codex4ever？','运行 codex plugin marketplace add ItsOdeLeo/codex4ever，再运行 codex plugin add codex4ever@codex4ever 安装插件。新开对话，让 Codex 根据当前额度规划用量即可。它读取本机已登录账户的额度，不需要另外的 API key。']
    ],
    notice:'OpenAI Codex 的非官方可视化用量规划工具。与 OpenAI 无隶属关系。'}
};

/** The deployment origin is explicit: never trust Host/forwarded headers or
 * publish a guessed domain, localhost canonical, or preview sitemap. */
export function publicSiteOrigin(value) {
  if(!value?.trim())return null;
  let url;
  try {url=new URL(value.trim());}catch {throw new Error('PUBLIC_SITE_URL must be an absolute HTTPS origin.');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'
    ||url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname==='[::1]'
    ||/^127\./.test(url.hostname))throw new Error('PUBLIC_SITE_URL must be a public HTTPS origin without a path, query or credentials.');
  return url.origin;
}

export function renderSeoHead({siteUrl=null,page='planner',language='en'}={}) {
  const origin=publicSiteOrigin(siteUrl);
  const guide=guides[language]??guides.en;
  const meta=page==='guide' ? guide : PLANNER_METADATA[language]??PLANNER_METADATA.en;
  const path=page==='guide' ? guide.path : '/';
  const url=origin ? origin+path : null;
  const schema=page==='guide' ? {
    '@context':'https://schema.org','@type':'TechArticle',headline:meta.heading,
    description:meta.description,inLanguage:language,about:{'@type':'WebApplication',name:'Codex4ever'},
    ...(url ? {url,mainEntityOfPage:url} : {})
  } : {
    '@context':'https://schema.org','@type':'WebApplication',name:'Codex4ever',
    description:meta.description,applicationCategory:'DeveloperApplication',operatingSystem:'Web',
    inLanguage:['en','zh-CN'],isAccessibleForFree:true,license:'https://opensource.org/licenses/MIT',
    author:{'@type':'Person',name:'ItsOdeLeo',url:CREATOR_URL},
    sameAs:[SOURCE_URL],...(url ? {url} : {})
  };
  return `<title>${escape(meta.title)}</title>
  <meta name="description" content="${escape(meta.description)}">
  <meta name="robots" content="${origin ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
  <meta property="og:site_name" content="Codex4ever">
  <meta property="og:type" content="${page==='guide' ? 'article' : 'website'}">
  <meta property="og:title" content="${escape(meta.title)}">
  <meta property="og:description" content="${escape(meta.description)}">
  <meta property="og:locale" content="${language==='zh-CN' ? 'zh_CN' : 'en_GB'}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(meta.title)}">
  <meta name="twitter:description" content="${escape(meta.description)}">
  ${url ? `<link rel="canonical" href="${escape(url)}">
  <meta property="og:url" content="${escape(url)}">
  <meta property="og:image" content="${escape(origin)}/public/social-card.png?v=3">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Codex4ever — Codex quota and reset planner">
  <meta name="twitter:image" content="${escape(origin)}/public/social-card.png?v=3">
  <meta name="twitter:image:alt" content="Codex4ever — Codex quota and reset planner">
  ${page==='guide' ? Object.entries(guides).map(([lang,entry])=>`<link rel="alternate" hreflang="${lang}" href="${escape(origin+entry.path)}">`).join('\n  ')+`\n  <link rel="alternate" hreflang="x-default" href="${escape(origin+guides.en.path)}">` : ''}` : ''}
  <script type="application/ld+json">${json(schema)}</script>${page==='guide' ? `
  <script type="application/ld+json">${json({'@context':'https://schema.org','@type':'FAQPage',inLanguage:language,
    mainEntity:guide.faq.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))})}</script>` : ''}`;
}

function renderGuide({language,siteUrl}) {
  const guide=guides[language];
  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${renderSeoHead({siteUrl,page:'guide',language})}
<meta name="theme-color" content="#F7D5D5"><link rel="stylesheet" href="/src/styles/guide.css"></head>
<body class="guide-page"><main>
<header class="site-header"><div class="brand"><span class="brand-mark" aria-hidden="true">${BRAND_MARK_SVG}</span><div><a href="/">Codex4ever</a></div></div>
<nav aria-label="${language==='en' ? 'Language' : '语言'}"><a href="/guide/" lang="en" hreflang="en"${language==='en' ? ' aria-current="page"' : ''}>English</a> · <a href="/zh/guide/" lang="zh-CN" hreflang="zh-CN"${language==='zh-CN' ? ' aria-current="page"' : ''}>中文</a></nav></header>
<article><h1>${escape(guide.heading)}</h1><p>${escape(guide.intro)}</p>
${guide.sections.map(([heading,text])=>`<section><h2>${escape(heading)}</h2><p>${escape(text)}</p></section>`).join('\n')}
<section><h2>${escape(guide.faqHeading)}</h2>
${guide.faq.map(([question,answer])=>`<h3>${escape(question)}</h3><p>${escape(answer)}</p>`).join('\n')}</section>
<p><a href="/">${escape(guide.back)} →</a></p></article>
<footer>© 2026 ItsOdeLeo · ${escape(guide.notice)} · <a href="${SOURCE_URL}" rel="noopener">${escape(guide.source)}</a> · ${escape(guide.credit)}: ${DATA_SOURCES.map(([name,url])=>`<a href="${url}" rel="noopener">${escape(name)}</a>`).join(', ')}</footer></main></body></html>`;
}

/** A plain-text site summary for AI assistants and answer engines (llmstxt.org). */
function renderLlmsText(origin) {
  const link=path=>(origin??'')+path;
  return `# Codex4ever

> ${PLANNER_METADATA.en.description} Unofficial; not affiliated with OpenAI. MIT licensed.

Codex4ever estimates when your remaining OpenAI Codex quota runs out, when a banked reset could help, and how possible extra resets change a daily usage plan. The website calculates in the browser; the Codex plugin reads a locally signed-in quota. Neither redeems resets or spends credits.

## Pages

- [Planner](${link('/')}): interactive quota and reset planner
- [Guide](${link(guides.en.path)}): how the planner and forecasts work, with FAQ
- [中文指南](${link(guides['zh-CN'].path)}): Chinese guide and FAQ

## Codex plugin

- Install: \`codex plugin marketplace add ItsOdeLeo/codex4ever\` then \`codex plugin add codex4ever@codex4ever\`
- [Source code](${SOURCE_URL}) (MIT)

## Data sources

${DATA_SOURCES.map(([name,url])=>`- [${name}](${url})`).join('\n')}: public reset history and the posts attached to it

## FAQ

${guides.en.faq.map(([question,answer])=>`- ${question} ${answer}`).join('\n')}
`;
}

/** SEO-only HTTP responses. No evidence fetches, account reads or solver calls. */
export function seoResponse({pathname,siteUrl=null,template}={}) {
  if(!['/','/index.html','/guide','/guide/','/zh/guide','/zh/guide/','/robots.txt','/sitemap.xml','/llms.txt'].includes(pathname))return null;
  const origin=publicSiteOrigin(siteUrl);
  const headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
  if(pathname==='/index.html'||pathname==='/guide'||pathname==='/zh/guide')return {
    status:308,headers:{...headers,Location:pathname==='/index.html' ? '/' : pathname+'/'},body:''};
  if(pathname==='/robots.txt')return {status:200,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'},body:
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /output/\nDisallow: /experiments/\nDisallow: /test/\nDisallow: /scripts/\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`};
  if(pathname==='/llms.txt')return {status:200,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'},body:renderLlmsText(origin)};
  if(pathname==='/sitemap.xml') {
    if(!origin)return {status:404,headers:{...headers,'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex'},body:'Sitemap requires PUBLIC_SITE_URL.'};
    const alternates=Object.entries(guides).map(([lang,entry])=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${escape(origin+entry.path)}"/>`).join('')
      +`<xhtml:link rel="alternate" hreflang="x-default" href="${escape(origin+guides.en.path)}"/>`;
    const pages=['/',guides.en.path,guides['zh-CN'].path];
    return {status:200,headers:{...headers,'Content-Type':'application/xml; charset=utf-8'},body:
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.map(path=>`<url><loc>${escape(origin+path)}</loc>${path==='/' ? '' : alternates}</url>`).join('')}</urlset>`};
  }
  const language=pathname==='/zh/guide/' ? 'zh-CN' : 'en';
  const body=pathname==='/' ? template.replace(/<!-- site-meta:start -->[\s\S]*?<!-- site-meta:end -->/,
    `<!-- site-meta:start -->\n  ${renderSeoHead({siteUrl:origin})}\n  <!-- site-meta:end -->`)
    : renderGuide({language,siteUrl:origin});
  return {status:200,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Language':language,
    ...(!origin ? {'X-Robots-Tag':'noindex'} : {})},body};
}
