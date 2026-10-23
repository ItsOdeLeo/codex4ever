import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { collectLiveResetEvidence } from '../src/live-reset-evidence.js';
import { publicSiteOrigin,seoResponse } from '../src/site-seo.js';
import { loadLocalLLMEnvironment } from '../src/local-llm-environment.js';
import { plannerEnv } from '../src/planner-name.js';

await loadLocalLLMEnvironment();

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const siteUrl=publicSiteOrigin(process.env.PUBLIC_SITE_URL);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png':'image/png', '.svg':'image/svg+xml' };
const classificationCache = new Map();
// Reuse one crawl for a while so repeated page loads cannot hammer upstream sources.
const evidenceTtlMs=Number(plannerEnv('EVIDENCE_TTL_MINUTES') || 30)*60_000;
let refreshInFlight,cachedSnapshot,cachedAt=0;
async function evidence() {
  if(cachedSnapshot && Date.now()-cachedAt<evidenceTtlMs)return cachedSnapshot;
  if(refreshInFlight)return refreshInFlight;
  refreshInFlight=(async()=>{
    let fallbackArchive;
    try {fallbackArchive=JSON.parse(await readFile(resolve(root,'output/live-reset-evidence.json'),'utf8'));}
    catch {fallbackArchive=JSON.parse(await readFile(resolve(root,'experiments/public-reset-events.json'),'utf8'));}
    const snapshot=await collectLiveResetEvidence({fallbackArchive,classificationCache});
    await mkdir(resolve(root,'output'),{recursive:true});
    await writeFile(resolve(root,'output/live-reset-evidence.json'),JSON.stringify(snapshot,null,2));
    cachedSnapshot=snapshot;cachedAt=Date.now();
    return snapshot;
  })().finally(()=>{refreshInFlight=null;});
  return refreshInFlight;
}

const server=http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if(url.pathname==='/api/reset-evidence' && req.method==='GET') {
      const origin=req.headers.origin;
      if(req.headers['sec-fetch-site']==='cross-site' || origin && ![
        `http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(origin)) {
        res.writeHead(403).end('Forbidden');return;
      }
      const snapshot=await evidence();
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex',
        'X-Content-Type-Options':'nosniff'}).end(JSON.stringify(snapshot));
      return;
    }
    if(['GET','HEAD'].includes(req.method)) {
      const seo=seoResponse({pathname:url.pathname,siteUrl,
        template:url.pathname==='/'||url.pathname==='/zh/' ? await readFile(resolve(root,'index.html'),'utf8') : undefined});
      if(seo) {
        res.writeHead(seo.status,seo.headers).end(req.method==='HEAD' ? undefined : seo.body);
        return;
      }
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep) || path.slice(root.length).split(sep).some(part => part.startsWith('.')) || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const body = await readFile(path);
    const mime=types[extname(path)]||'text/plain';
    res.writeHead(200, { 'Content-Type': /^(?:text\/|image\/svg)/.test(mime) ? `${mime}; charset=utf-8` : mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Usage Planner local test page: http://127.0.0.1:${server.address().port}`));
