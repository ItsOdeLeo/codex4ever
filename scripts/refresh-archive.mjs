// Rebuild the bundled offline history from Codex Resets, the one public source.
// Used only when the live API is unreachable. Banked-only grants are excluded.
import { writeFile } from 'node:fs/promises';
import { RESET_HISTORY_URL,normalizeResetFeed } from '../src/live-reset-evidence.js';

const response=await fetch(RESET_HISTORY_URL,{headers:{accept:'application/json'}});
if(!response.ok)throw new Error(`Codex Resets returned HTTP ${response.status}`);
const now=new Date();
const events=normalizeResetFeed(await response.json(),now)
  .filter(event=>event.kind!=='banked')
  .map(({at,kind,sourceUrl})=>({at,kind,sourceUrl}))
  .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
if(events.length<4)throw new Error('Too few events; archive left unchanged');
const archive={source:'https://codex-resets.com',retrievedAt:now.toISOString().slice(0,10),
  description:'Public automatic reset announcements from Codex Resets (codex-resets.com). Times are announcement timestamps, not personal quota refreshes. Banked-only grants excluded.',
  events};
await writeFile(new URL('../experiments/public-reset-events.json',import.meta.url),JSON.stringify(archive,null,2)+'\n');
console.log(`${events.length} events, ${events[0].at} – ${events.at(-1).at}`);
