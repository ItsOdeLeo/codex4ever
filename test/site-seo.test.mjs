import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { publicSiteOrigin,renderSeoHead,seoResponse } from '../src/site-seo.js';
import { PLANNER_METADATA,syncPlannerMetadata } from '../src/page-metadata.js';

const siteUrl='https://usage-planner.example';
const template=await readFile(new URL('../index.html',import.meta.url),'utf8');
const structured=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));

test('未运行 JavaScript 的首页也有介绍、独立元信息和可抓取的说明链接',()=>{
  const fallback=template.match(/<!-- site-meta:start -->\s*([\s\S]*?)\s*<!-- site-meta:end -->/)[1];
  const clean=value=>value.replace(/[ \t]+$/gm,'');
  assert.equal(clean(fallback),clean(renderSeoHead()));
  const page=seoResponse({pathname:'/',siteUrl,template});
  assert.equal(page.status,200);
  assert.equal(page.headers['Content-Language'],'en');
  assert.equal((page.body.match(/<title>/g)??[]).length,1);
  assert.equal((page.body.match(/name="description"/g)??[]).length,1);
  assert.equal((page.body.match(/rel="canonical"/g)??[]).length,1);
  assert.match(page.body,/<html lang="en">/);
  assert.match(page.body,/<noscript><p>Usage Planner compares daily Codex usage/);
  assert.match(page.body,/<a id="planner-guide" href="\/guide\/">How it works<\/a>/);
  assert.match(page.body,/<link rel="canonical" href="https:\/\/usage-planner.example\/">/);
  assert.match(page.body,/name="robots" content="index, follow, max-image-preview:large"/);
  assert.match(page.body,/property="og:image" content="https:\/\/usage-planner.example\/public\/social-card.png\?v=\d+"/);
  const [schema]=structured(page.body);
  assert.equal(schema['@type'],'WebApplication');
  assert.equal(schema.applicationCategory,'DeveloperApplication');
  assert.equal(schema.url,siteUrl+'/');
  assert.deepEqual(schema.inLanguage,['en','zh-CN']);
  assert.equal(schema.aggregateRating,undefined,'不编造评分来争取富搜索结果');
  assert.equal(schema.offers,undefined,'不编造价格信息');
});

test('中英文指南直接返回正文、自身 canonical 和双向 hreflang，均有真实链接',()=>{
  for(const [pathname,language,title] of [['/guide/','en','Plan your Codex usage'],['/zh/guide/','zh-CN','规划你的 Codex 用量']]) {
    const page=seoResponse({pathname,siteUrl});
    assert.equal(page.status,200);
    assert.equal(page.headers['Content-Language'],language);
    assert.ok(page.body.includes(`<html lang="${language}">`));
    assert.ok(page.body.includes(`<h1>${title}</h1>`));
    assert.ok(page.body.includes(`<link rel="canonical" href="${siteUrl+pathname}">`));
    assert.match(page.body,/<link rel="alternate" hreflang="en" href="https:\/\/usage-planner.example\/guide\/">/);
    assert.match(page.body,/<link rel="alternate" hreflang="zh-CN" href="https:\/\/usage-planner.example\/zh\/guide\/">/);
    assert.match(page.body,/<link rel="alternate" hreflang="x-default" href="https:\/\/usage-planner.example\/guide\/">/);
    assert.match(page.body,/<a href="\/guide\/" lang="en" hreflang="en"/);
    assert.match(page.body,/<a href="\/zh\/guide\/" lang="zh-CN" hreflang="zh-CN"/);
    assert.equal((page.body.match(/<h2>/g)??[]).length,7);
    assert.doesNotMatch(page.body,/<script (?!type="application\/ld\+json")/);
    const [schema]=structured(page.body);
    assert.equal(schema['@type'],'TechArticle');
    assert.equal(schema.inLanguage,language);
    assert.equal(schema.mainEntityOfPage,siteUrl+pathname);
  }
});

test('robots 允许渲染所需文件，sitemap 只列正式页面，不产生虚假更新时间',()=>{
  const robots=seoResponse({pathname:'/robots.txt',siteUrl});
  assert.equal(robots.headers['Content-Type'],'text/plain; charset=utf-8');
  assert.match(robots.body,/Allow: \/\n/);
  assert.match(robots.body,/Sitemap: https:\/\/usage-planner.example\/sitemap.xml/);
  assert.doesNotMatch(robots.body,/Disallow: \/(?:src|public)\//);
  const sitemap=seoResponse({pathname:'/sitemap.xml',siteUrl});
  assert.equal(sitemap.headers['Content-Type'],'application/xml; charset=utf-8');
  assert.deepEqual([...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]),
    [siteUrl+'/',siteUrl+'/guide/',siteUrl+'/zh/guide/']);
  assert.equal((sitemap.body.match(/hreflang="zh-CN"/g)??[]).length,2);
  assert.doesNotMatch(sitemap.body,/lastmod|priority|changefreq|localhost|127\.0\.0\.1|\/api\//);
});

test('没有正式域名的预览使用 noindex，不输出猜测的 canonical 或 sitemap',()=>{
  for(const pathname of ['/','/guide/','/zh/guide/']) {
    const response=seoResponse({pathname,template});
    assert.equal(response.headers['X-Robots-Tag'],'noindex');
    assert.match(response.body,/name="robots" content="noindex, follow"/);
    assert.doesNotMatch(response.body.split('</head>')[0],/rel="canonical"|property="og:url"|hreflang=/);
  }
  assert.equal(seoResponse({pathname:'/sitemap.xml'}).status,404);
  assert.doesNotMatch(seoResponse({pathname:'/robots.txt'}).body,/Sitemap:/);
  for(const pathname of ['/index.html','/guide','/zh/guide'])assert.equal(seoResponse({pathname}).status,308);
  assert.equal(seoResponse({pathname:'/not-a-page',siteUrl}),null);
});

test('域名只来自显式 HTTPS 配置，语言切换更新描述而不篡改 canonical',()=>{
  assert.equal(publicSiteOrigin(undefined),null);
  assert.equal(publicSiteOrigin(' https://usage-planner.example/ '),siteUrl);
  for(const value of ['usage-planner.example','http://usage-planner.example','https://localhost',
    'https://127.0.0.1','https://[::1]','https://user:secret@usage-planner.example',
    'https://usage-planner.example/path','https://usage-planner.example/?track=1','https://usage-planner.example/#x'])
    assert.throws(()=>publicSiteOrigin(value),/PUBLIC_SITE_URL/);
  const attributes=new Map();
  const document={querySelector:selector=>({setAttribute:(key,value)=>attributes.set(`${selector}:${key}`,value)})};
  for(const language of ['en','zh-CN']) {
    syncPlannerMetadata(document,language);
    assert.equal(document.title,PLANNER_METADATA[language].title);
    assert.equal(attributes.get('meta[name="description"]:content'),PLANNER_METADATA[language].description);
    assert.equal(attributes.get('meta[property="og:locale"]:content'),PLANNER_METADATA[language].locale);
    assert.ok(![...attributes.keys()].some(key=>key.includes('canonical')));
  }
});

async function startServer(publicUrl) {
  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0',PUBLIC_SITE_URL:publicUrl??''},
    stdio:['ignore','pipe','pipe']
  });
  child.stderr.resume();
  const origin=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(new Error('SEO test server startup timed out'));},5000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error(`SEO test server exited: ${code}`));});
    let output='';
    child.stdout.on('data',chunk=>{
      output+=chunk;
      const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if(match){clearTimeout(timer);resolve(match[0]);}
    });
  });
  return {origin,close:()=>new Promise(resolve=>{child.once('exit',resolve);child.kill();})};
}

test('真实 HTTP 服务输出原始 SEO HTML、有效图片、正确状态码和预览 noindex',async()=>{
  for(const publicUrl of [siteUrl,null]) {
    const server=await startServer(publicUrl);
    try {
      for(const path of ['/','/guide/','/zh/guide/','/robots.txt','/sitemap.xml']) {
        const response=await fetch(server.origin+path);
        const body=await response.text();
        assert.equal(response.status,publicUrl===null&&path==='/sitemap.xml' ? 404 : 200,path);
        if(path==='/'||path.endsWith('guide/')) {
          assert.match(body,/<title>[^<]*Codex[^<]*<\/title>/);
          assert.equal((body.match(/rel="canonical"/g)??[]).length,publicUrl ? 1 : 0);
          assert.equal(response.headers.get('x-robots-tag'),publicUrl ? null : 'noindex');
        }
      }
      const redirect=await fetch(server.origin+'/index.html',{redirect:'manual'});
      assert.equal(redirect.status,308);
      assert.equal(redirect.headers.get('location'),'/');
      assert.equal((await fetch(server.origin+'/not-a-page')).status,404,'未知路径不得返回首页的 soft 404');
      assert.equal((await fetch(server.origin+'/guide/',{method:'HEAD'})).status,200);
      assert.equal((await fetch(server.origin+'/guide/',{method:'HEAD'})).headers.get('content-type'),'text/html; charset=utf-8');
      const image=await fetch(server.origin+'/public/social-card.png');
      assert.equal(image.headers.get('content-type'),'image/png');
      const bytes=new Uint8Array(await image.arrayBuffer());
      assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
      assert.equal(new DataView(bytes.buffer).getUint32(16),1200);
      assert.equal(new DataView(bytes.buffer).getUint32(20),630);
      for(const path of ['/src/web.js','/src/page-metadata.js','/src/styles/theme.css','/src/styles/guide.css'])
        assert.equal((await fetch(server.origin+path)).status,200,path);
    }finally{await server.close();}
  }
});

test('指南带可见 FAQ 与对应 FAQPage 结构化数据，llms.txt 概述站点给 AI 引擎',()=>{
  for(const [pathname,language] of [['/guide/','en'],['/zh/guide/','zh-CN']]) {
    const page=seoResponse({pathname,siteUrl});
    const faq=structured(page.body).find(schema=>schema['@type']==='FAQPage');
    assert.equal(faq.inLanguage,language);
    assert.ok(faq.mainEntity.length>=3);
    for(const item of faq.mainEntity) {
      assert.ok(page.body.includes(`<h3>${item.name.replace(/'/g,'&#39;')}</h3>`),'结构化问答必须在页面上可见');
      assert.ok(item.acceptedAnswer.text.length>20);
    }
  }
  const llms=seoResponse({pathname:'/llms.txt',siteUrl});
  assert.equal(llms.headers['Content-Type'],'text/plain; charset=utf-8');
  assert.match(llms.body,/^# Usage Planner\n\n> /);
  assert.match(llms.body,/\(https:\/\/usage-planner.example\/guide\/\)/);
  assert.match(llms.body,/not affiliated with OpenAI/);
});
