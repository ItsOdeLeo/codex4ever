import { PLANNER_METADATA } from './page-metadata.js';
import { BRAND_MARK_SVG } from './brand-mark.js';
import { WORDMARK_EN,WORDMARK_ZH } from './wordmarks.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
// codex-resets.com asks for a linked credit wherever its data is shown.
// Public by design: IndexNow verifies site ownership by fetching /<key>.txt.
export const INDEXNOW_KEY='98f3b4121e21dd55fee643d8af3a1002';
export const SOURCE_URL='https://github.com/ItsOdeLeo/usage-planner';
export const CREATOR_URL='https://x.com/ItsOdeLeo';
export const DATA_SOURCES=[['Codex Resets','https://codex-resets.com']];
const guides={
  en:{path:'/guide/',title:'Codex Usage, Quota & Reset Planning Guide | Usage Planner',
    description:'Learn how Usage Planner estimates quota depletion, compares banked and extra resets, and plans daily Codex usage with a local MCP interface.',
    heading:'Plan your Codex usage',back:'Open the planner',
    intro:'Usage Planner (formerly Codex4ever) is an unofficial planner for your OpenAI Codex weekly quota. It shows how long your quota lasts at your current pace, when an extra reset is likely, and when a banked reset is worth using.',
    sections:[
      ['Start with your current quota',"Enter how much of this week's quota is left and how long until the normal refresh, plus the expiry dates of any banked resets. The planner works out your daily usage from what you have used so far and shows when you would run out."],
      ['Pick a strategy','Keep pace uses your current daily rate. Keep available slows down so you never run dry. Use it all spends everything before the next refill. Weekdays only and Weekends only put all the usage on those days. The timeline shows daily usage, remaining quota, refills and when you would run out.'],
      ['Read the reset forecast','The forecast learns from every public reset announcement: how far apart resets are and what time they usually land. Posts by Tibo of the Codex team count too, and an announced reset is shown at its announced time. The first curve is the next extra reset; the second assumes the first happens at its marker. These are estimates, not promises.'],
      ['Plan without resets too','Turn on Assume no reset to see every strategy planned as if no extra reset comes. Each refill, whether a banked reset, the normal refresh or a reset, starts a new seven-day cycle. After a real reset, update your quota and plan again.'],
      ['Use it inside Codex','The Codex plugin reads your signed-in quota on your own computer and opens the same planner beside the chat. Other MCP clients can use the npm package usage-planner. The forecast works without any API key.'],
      ['Your account stays yours','The website calculates everything in your browser and never sends your quota anywhere. Neither the website nor the plugin redeems a reset or spends credits for you.']
    ],
    source:'Open source on GitHub',
    credit:'Thanks to',creditSuffix:'for reset data',
    faqHeading:'Frequently asked questions',
    faq:[
      ['Is Usage Planner affiliated with OpenAI?','No. Usage Planner is an unofficial, MIT-licensed planner built by an independent developer. It is not affiliated with or endorsed by OpenAI.'],
      ['Does the website send my quota to a server?','No. The website calculates your plan in your browser. It only downloads public reset evidence, and your quota inputs never leave the page.'],
      ['Does Usage Planner redeem banked resets or spend credits?','No. It only recommends a daily usage rate and shows when a banked reset could help. You decide whether to redeem anything in Codex.'],
      ['How are extra resets forecast?','The forecast uses public historical reset announcements, the current reset campaign and public posts by Tibo of the OpenAI Codex team. Its probabilities are experimental estimates, not guarantees that your account will refresh.'],
      ['How do I use Usage Planner inside Codex?','Install the plugin with: codex plugin marketplace add ItsOdeLeo/usage-planner, then codex plugin add usage-planner@usage-planner. Start a new chat and ask Codex to plan your usage from your current quota. It reads your local, signed-in quota and needs no separate API key.']
    ],
    notice:'Unofficial visual usage planner for OpenAI Codex. Not affiliated with OpenAI.'},
  'zh-CN':{path:'/zh/guide/',title:'Codex 用量与 reset 规划指南 | 赛博牛马规划器',
    description:'赛博牛马规划器帮你规划 Codex 每周额度：按现在的速度能用多久、额外 reset 大概什么时候来、备用 reset 什么时候值得用。',
    heading:'规划你的 Codex 用量',back:'打开规划器',
    intro:'赛博牛马规划器（英文名 Usage Planner，原名 Codex4ever）是 OpenAI Codex 每周额度的非官方规划工具。它告诉你按现在的速度额度能撑多久、额外 reset 大概什么时候来，以及备用 reset 什么时候值得用。',
    sections:[
      ['从现在的额度开始','填上本周还剩多少额度、离正常刷新还有多久，有备用 reset 的话再填上到期日期。规划器会根据你已经用掉的额度算出每天的用量，并告诉你什么时候会用完。'],
      ['选一种用法','稳如老狗：按现在的速度用。细水长流：必要时放慢，保证一直有额度。赛博牛马拉满：在下次补满前全部用完。周末躺平、周末卷起来：把额度集中在对应的日子。时间轴上能看到每天用多少、剩多少、什么时候补满、什么时候用完。'],
      ['看懂 reset 预测','预测参考了所有公开的 reset 记录：两次 reset 一般隔多久、通常在几点发。Codex 团队 Tibo 发的帖子也会算进去；他已经宣布的 reset，会直接按宣布的时间显示。第一条曲线是下一次额外 reset，第二条假设第一次发生在标记的时间。这些都是估算，不是保证。'],
      ['也看看没有 reset 的情况','打开「假设没有 reset」，所有用法都会按一次额外 reset 都不来重新规划。每次补满（备用 reset、正常刷新或额外 reset）都会重新开始 7 天周期。真的 reset 之后，更新额度再算一遍就行。'],
      ['在 Codex 里直接用','装上 Codex 插件后，它会在你自己的电脑上读取已登录账户的额度，并在对话旁边打开同一个规划器。其他 MCP 客户端可以用 npm 包 usage-planner。预测不需要任何 API key。'],
      ['账户始终在你手里','网页的所有计算都在浏览器里完成，不会把你的额度发到任何地方。网页和插件都不会替你兑换 reset，也不会消耗 credits。']
    ],
    source:'GitHub 开源',
    credit:'感谢',creditSuffix:'提供 reset 数据',
    faqHeading:'常见问题',
    faq:[
      ['赛博牛马规划器是 OpenAI 官方的吗？','不是。赛博牛马规划器是独立开发者制作的非官方规划器，以 MIT 协议开源，与 OpenAI 无隶属或背书关系。'],
      ['网页会把我的额度发送到服务器吗？','不会。网页在浏览器内计算计划，只下载公开的 reset 证据，你填写的额度不会离开页面。'],
      ['赛博牛马规划器会自动兑换备用 reset 或消耗 credits 吗？','不会。它只建议日均用量，并显示备用 reset 何时可能有用。是否兑换由你在 Codex 中决定。'],
      ['额外 reset 是怎么预测的？','预测依据公开的历史 reset 公告、当前 reset 活动，以及 OpenAI Codex 团队 Tibo 的公开帖子。概率是实验性估计，不保证个人账户一定刷新。'],
      ['怎样在 Codex 里使用赛博牛马规划器？','运行 codex plugin marketplace add ItsOdeLeo/usage-planner，再运行 codex plugin add usage-planner@usage-planner 安装插件。新开对话，让 Codex 根据当前额度规划用量即可。它读取本机已登录账户的额度，不需要另外的 API key。']
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
    description:meta.description,inLanguage:language,about:{'@type':'WebApplication',name:'Usage Planner'},
    ...(url ? {url,mainEntityOfPage:url} : {})
  } : {
    '@context':'https://schema.org','@type':'WebApplication',name:'Usage Planner',alternateName:['赛博牛马规划器','Codex4ever'],
    description:meta.description,applicationCategory:'DeveloperApplication',operatingSystem:'Web',
    inLanguage:['en','zh-CN'],isAccessibleForFree:true,license:'https://opensource.org/licenses/MIT',
    author:{'@type':'Person',name:'ItsOdeLeo',url:CREATOR_URL},
    sameAs:[SOURCE_URL],...(url ? {url} : {})
  };
  return `<title>${escape(meta.title)}</title>
  <meta name="description" content="${escape(meta.description)}">
  <meta name="robots" content="${origin ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
  <meta property="og:site_name" content="Usage Planner">
  <meta property="og:type" content="${page==='guide' ? 'article' : 'website'}">
  <meta property="og:title" content="${escape(meta.title)}">
  <meta property="og:description" content="${escape(meta.description)}">
  <meta property="og:locale" content="${language==='zh-CN' ? 'zh_CN' : 'en_GB'}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(meta.title)}">
  <meta name="twitter:description" content="${escape(meta.description)}">
  ${url ? `<link rel="canonical" href="${escape(url)}">
  <meta property="og:url" content="${escape(url)}">
  <meta property="og:image" content="${escape(origin)}/public/social-card.png?v=4">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Usage Planner — Codex quota and reset planner">
  <meta name="twitter:image" content="${escape(origin)}/public/social-card.png?v=4">
  <meta name="twitter:image:alt" content="Usage Planner — Codex quota and reset planner">
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
<header class="site-header"><div class="brand"><span class="brand-mark" aria-hidden="true">${BRAND_MARK_SVG}</span><div><a href="/" aria-label="${language==='zh-CN' ? '赛博牛马规划器' : 'Usage Planner'}">${language==='zh-CN' ? WORDMARK_ZH : WORDMARK_EN}</a></div></div>
<nav aria-label="${language==='en' ? 'Language' : '语言'}"><a href="/guide/" lang="en" hreflang="en"${language==='en' ? ' aria-current="page"' : ''}>English</a> · <a href="/zh/guide/" lang="zh-CN" hreflang="zh-CN"${language==='zh-CN' ? ' aria-current="page"' : ''}>中文</a></nav></header>
<article><h1>${escape(guide.heading)}</h1><p>${escape(guide.intro)}</p>
${guide.sections.map(([heading,text])=>`<section><h2>${escape(heading)}</h2><p>${escape(text)}</p></section>`).join('\n')}
<section><h2>${escape(guide.faqHeading)}</h2>
${guide.faq.map(([question,answer])=>`<h3>${escape(question)}</h3><p>${escape(answer)}</p>`).join('\n')}</section>
<p><a href="/">${escape(guide.back)} →</a></p></article>
<footer>© 2026 ItsOdeLeo · ${escape(guide.notice)} · <a href="${SOURCE_URL}" rel="noopener">${escape(guide.source)}</a> · ${escape(guide.credit)} ${DATA_SOURCES.map(([name,url])=>`<a href="${url}" rel="noopener">${escape(name)}</a>`).join(', ')} ${escape(guide.creditSuffix)}</footer></main></body></html>`;
}

/** A plain-text site summary for AI assistants and answer engines (llmstxt.org). */
function renderLlmsText(origin) {
  const link=path=>(origin??'')+path;
  return `# Usage Planner

> ${PLANNER_METADATA.en.description} Unofficial; not affiliated with OpenAI. MIT licensed.

Usage Planner (Chinese name 赛博牛马规划器, formerly Codex4ever) estimates when your remaining OpenAI Codex quota runs out, when a banked reset could help, and how possible extra resets change a daily usage plan. The website calculates in the browser; the Codex plugin reads a locally signed-in quota. Neither redeems resets or spends credits.

## Pages

- [Planner](${link('/')}): interactive quota and reset planner
- [Guide](${link(guides.en.path)}): how the planner and forecasts work, with FAQ
- [中文指南](${link(guides['zh-CN'].path)}): Chinese guide and FAQ

## Codex plugin

- Install: \`codex plugin marketplace add ItsOdeLeo/usage-planner\` then \`codex plugin add usage-planner@usage-planner\`
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
