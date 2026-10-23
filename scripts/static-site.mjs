import { build } from 'esbuild';
import { readFile,writeFile,mkdir,copyFile,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { seoResponse,INDEXNOW_KEY } from '../src/site-seo.js';

export const root=resolve(fileURLToPath(new URL('../',import.meta.url)));

/** Bundle the browser planner into a self-contained static directory.
 * The plugin keeps the unindexed template; a public site passes its origin
 * so pages carry canonical URLs and robots/sitemap files are written. */
export async function buildStaticSite({outDir,siteUrl=null,extraPublic=[]}) {
  await rm(outDir,{recursive:true,force:true});
  await mkdir(outDir,{recursive:true});
  await build({absWorkingDir:root,entryPoints:{app:'src/web.js'},bundle:true,platform:'browser',target:'es2022',
    format:'esm',outdir:outDir,legalComments:'none'});
  await build({absWorkingDir:root,entryPoints:['src/styles/theme.css'],bundle:true,
    external:['/public/*'],outfile:resolve(outDir,'app.css')});
  await build({absWorkingDir:root,entryPoints:['src/styles/guide.css'],bundle:true,
    external:['/public/*'],outfile:resolve(outDir,'guide.css')});
  // Fingerprinted URLs: the CDN lets browsers keep assets for hours, and a
  // fresh page with a stale script breaks. A new build gets new asset URLs.
  const asset=async name=>`/${name}?v=${createHash('sha256').update(await readFile(resolve(outDir,name))).digest('hex').slice(0,12)}`;
  const [appJs,appCss,guideCss]=await Promise.all(['app.js','app.css','guide.css'].map(asset));
  const template=await readFile(resolve(root,'index.html'),'utf8');
  const index=siteUrl ? seoResponse({pathname:'/',siteUrl,template}).body : template;
  await writeFile(resolve(outDir,'index.html'),index.replace('/src/styles/theme.css',appCss).replace('/src/web.js',appJs));
  for(const pathname of ['/guide/','/zh/guide/']) {
    const directory=resolve(outDir,'.'+pathname);
    await mkdir(directory,{recursive:true});
    await writeFile(resolve(directory,'index.html'),seoResponse({pathname,siteUrl}).body.replace('/src/styles/guide.css',guideCss));
  }
  if(siteUrl)for(const pathname of ['/robots.txt','/sitemap.xml','/llms.txt'])
    await writeFile(resolve(outDir,'.'+pathname),seoResponse({pathname,siteUrl}).body);
  if(siteUrl)await writeFile(resolve(outDir,`${INDEXNOW_KEY}.txt`),INDEXNOW_KEY);
  // Cloudflare Pages serves this with status 404; without it, every missing
  // path returns the planner page with 200 (a soft 404 for crawlers and fetch).
  await writeFile(resolve(outDir,'404.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | Usage Planner</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="${guideCss}"></head>
<body><main><h1>Page not found</h1><p><a href="/">Open Usage Planner</a> · <a href="/guide/">How it works</a></p></main></body></html>
`);
  await mkdir(resolve(outDir,'public'),{recursive:true});
  for(const name of extraPublic)await copyFile(resolve(root,'public',name),resolve(outDir,'public',name));
  await mkdir(resolve(outDir,'experiments'),{recursive:true});
  await copyFile(resolve(root,'experiments/public-reset-events.json'),resolve(outDir,'experiments/public-reset-events.json'));
}
