import { build } from 'esbuild';
import { readFile,writeFile,mkdir,copyFile,readdir,rm } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildStaticSite } from './static-site.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const plugin=resolve(root,'plugins/usage-planner');
const manifest=JSON.parse(await readFile(resolve(plugin,'plugin.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(manifest.version!==pkg.version)throw new Error('Plugin and package versions must match');
await mkdir(resolve(plugin,'server'),{recursive:true});
await build({absWorkingDir:root,entryPoints:['src/mcp-server.js'],bundle:true,platform:'node',target:'node20',
  format:'esm',outfile:resolve(plugin,'server/usage-planner.mjs'),legalComments:'linked',
  // The server reports the released version, not a hand-kept constant.
  define:{__PLANNER_VERSION__:JSON.stringify(pkg.version)},
  banner:{js:'import { createRequire as __nodeCreateRequire } from "node:module"; const require = __nodeCreateRequire(import.meta.url);'}});
// In-conversation quota reminders: a Codex hook bundled with the plugin. It
// stays silent unless the user turned reminders on (usage_alerts enable).
await mkdir(resolve(plugin,'hooks'),{recursive:true});
await build({absWorkingDir:root,entryPoints:['src/quota-hook.js'],bundle:true,platform:'node',target:'node20',
  format:'esm',outfile:resolve(plugin,'hooks/quota-check.mjs'),legalComments:'none'});
const hook={type:'command',command:'node "$PLUGIN_ROOT/hooks/quota-check.mjs"',timeout:20};
await writeFile(resolve(plugin,'hooks/hooks.json'),JSON.stringify({hooks:{
  SessionStart:[{matcher:'startup|resume',hooks:[hook]}],
  UserPromptSubmit:[{hooks:[hook]}]}},null,2)+'\n');
// The installed plugin owns a complete static UI; no checkout or dev server is needed.
await buildStaticSite({outDir:resolve(plugin,'web')});
await mkdir(resolve(plugin,'experiments'),{recursive:true});
await copyFile(resolve(root,'experiments/public-reset-events.json'),resolve(plugin,'experiments/public-reset-events.json'));
await copyFile(resolve(root,'LICENSE'),resolve(plugin,'LICENSE'));
const notices=[];
for(const name of ['@modelcontextprotocol/server','@modelcontextprotocol/core','zod']) {
  const base=resolve(root,'node_modules',name),files=await readdir(base);
  const license=files.find(file=>/^license(?:\.|$)/i.test(file));
  if(!license)throw new Error(`Missing dependency license: ${name}`);
  notices.push(`${name}\n${await readFile(resolve(base,license),'utf8')}`);
}
await writeFile(resolve(plugin,'THIRD_PARTY_NOTICES.txt'),notices.join('\n\n'));
// Compatibility metadata is generated from the portable source, not edited
// separately. Dependencies are in the bundle; installation runs no npm scripts.
await mkdir(resolve(plugin,'.codex-plugin'),{recursive:true});
await writeFile(resolve(plugin,'.codex-plugin/plugin.json'),JSON.stringify({
  name:manifest.name,version:manifest.version,description:manifest.description,author:manifest.author,
  homepage:manifest.homepage,license:manifest.license,keywords:manifest.keywords,
  skills:'./skills/',mcpServers:'./.mcp.json',hooks:'./hooks/hooks.json',...manifest.extensions['com.openai']
},null,2)+'\n');
const portable=JSON.parse(await readFile(resolve(plugin,'mcp.json'),'utf8'));
await writeFile(resolve(plugin,'.mcp.json'),JSON.stringify({mcpServers:portable.mcpServers},null,2)+'\n');
const allowed=new Set(['plugin.json','mcp.json','.codex-plugin','.mcp.json','skills','assets','server','web','hooks','experiments','LICENSE','THIRD_PARTY_NOTICES.txt']);
for(const name of await readdir(plugin))if(!allowed.has(name))throw new Error(`Unexpected plugin package entry: ${name}`);
const archive=resolve(root,`output/usage-planner-plugin-${manifest.version}.zip`);
await mkdir(dirname(archive),{recursive:true});
await rm(archive,{force:true});
execFileSync('zip',['-q','-r',archive,'.'],{cwd:plugin});
console.log(JSON.stringify({plugin,archive,version:manifest.version}));
