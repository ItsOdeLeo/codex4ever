// Public website build: a fully static directory. Reset evidence (including
// optional LLM post classification) is collected here, at build time, so the
// deployed site exposes no endpoint that crawls sources or spends API keys.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { collectLiveResetEvidence } from '../src/live-reset-evidence.js';
import { loadLocalLLMEnvironment } from '../src/local-llm-environment.js';
import { publicSiteOrigin } from '../src/site-seo.js';
import { buildStaticSite,root } from './static-site.mjs';
import { plannerEnv } from '../src/planner-name.js';

await loadLocalLLMEnvironment();
const siteUrl=publicSiteOrigin(process.env.PUBLIC_SITE_URL);
const outDir=resolve(root,process.env.SITE_OUT_DIR||'dist');
await buildStaticSite({outDir,siteUrl,extraPublic:['social-card.png','social-card-zh.png']});

const fallbackArchive=JSON.parse(await readFile(resolve(root,'experiments/public-reset-events.json'),'utf8'));
// Post classifications persist between builds (CI restores this file with
// actions/cache), so only new or edited posts reach the LLM. Keys include the
// classifier version, model and post text, so stale entries never match.
const cacheFile=resolve(root,plannerEnv('CLASSIFICATION_CACHE')||'.cache/classifications.json');
let classificationCache;
try {classificationCache=new Map(JSON.parse(await readFile(cacheFile,'utf8')));}
catch {classificationCache=new Map();}
const cachedBefore=classificationCache.size;
const snapshot=process.argv.includes('--offline') ? fallbackArchive
  : await collectLiveResetEvidence({fallbackArchive,classificationCache});
await mkdir(dirname(cacheFile),{recursive:true});
await writeFile(cacheFile,JSON.stringify([...classificationCache]));
await mkdir(resolve(outDir,'data'),{recursive:true});
await writeFile(resolve(outDir,'data/reset-evidence.json'),JSON.stringify(snapshot));
// Cloudflare Pages header rules: the same hardening the local server sends,
// and data files stay out of search results.
await writeFile(resolve(outDir,'_headers'),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
/data/*
  Cache-Control: no-cache
  X-Robots-Tag: noindex
/experiments/*
  X-Robots-Tag: noindex
`);
console.log(JSON.stringify({outDir,siteUrl,retrievedAt:snapshot.retrievedAt,events:snapshot.events?.length??0,
  classification:snapshot.classification,cachedBefore,cachedAfter:classificationCache.size}));
