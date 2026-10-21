import { build } from 'esbuild';
import { readFile,writeFile,mkdir,copyFile,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seoResponse } from '../src/site-seo.js';

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
  const template=await readFile(resolve(root,'index.html'),'utf8');
  const index=siteUrl ? seoResponse({pathname:'/',siteUrl,template}).body : template;
  await writeFile(resolve(outDir,'index.html'),index.replace('/src/styles/theme.css','/app.css').replace('/src/web.js','/app.js'));
  for(const pathname of ['/guide/','/zh/guide/']) {
    const directory=resolve(outDir,'.'+pathname);
    await mkdir(directory,{recursive:true});
    await writeFile(resolve(directory,'index.html'),seoResponse({pathname,siteUrl}).body.replace('/src/styles/guide.css','/guide.css'));
  }
  if(siteUrl)for(const pathname of ['/robots.txt','/sitemap.xml','/llms.txt'])
    await writeFile(resolve(outDir,'.'+pathname),seoResponse({pathname,siteUrl}).body);
  const font=resolve(outDir,'public/fonts/vt323');
  await mkdir(font,{recursive:true});
  for(const name of ['VT323-Regular.ttf','OFL.txt'])await copyFile(resolve(root,'public/fonts/vt323',name),resolve(font,name));
  for(const name of extraPublic)await copyFile(resolve(root,'public',name),resolve(outDir,'public',name));
  await mkdir(resolve(outDir,'experiments'),{recursive:true});
  await copyFile(resolve(root,'experiments/public-reset-events.json'),resolve(outDir,'experiments/public-reset-events.json'));
}
