// Ask IndexNow search engines (Bing and others) to recrawl the public pages.
// Run after a deploy that changes page content, not on every data refresh.
import { INDEXNOW_KEY,publicSiteOrigin } from '../src/site-seo.js';

const origin=publicSiteOrigin(process.env.PUBLIC_SITE_URL??'https://usageplanner.com');
const urlList=['/','/guide/','/zh/guide/','/llms.txt'].map(path=>origin+path);
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',
  headers:{'content-type':'application/json; charset=utf-8'},
  body:JSON.stringify({host:new URL(origin).host,key:INDEXNOW_KEY,keyLocation:`${origin}/${INDEXNOW_KEY}.txt`,urlList})});
console.log(`IndexNow: HTTP ${response.status} for ${urlList.length} URLs`);
if(!response.ok&&response.status!==202)process.exit(1);
