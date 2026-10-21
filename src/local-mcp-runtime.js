import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { access } from 'node:fs/promises';
import { startPlannerPage } from './local-planner-page.js';

export async function startLocalMcp(createServer) {
  let root;
  for(const relative of ['../web/','../plugins/codex4ever/web/']) {
    const candidate=new URL(relative,import.meta.url);
    try {await access(new URL('index.html',candidate));root=candidate;break;}catch {/* Try development build. */}
  }
  if(!root)throw new Error('Bundled frontend is missing. Run npm run plugin:build.');
  const plannerPage=await startPlannerPage({root});
  let closing=false;
  const close=async()=>{if(closing)return;closing=true;await plannerPage.close();};
  process.stdin.once('end',close);
  process.once('SIGTERM',()=>{void close().then(()=>process.exit(0));});
  process.once('SIGINT',()=>{void close().then(()=>process.exit(0));});
  try {await serveStdio(()=>createServer({plannerPage}));}catch(error){await close();throw error;}
}
