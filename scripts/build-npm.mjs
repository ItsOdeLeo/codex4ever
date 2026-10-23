// Build the npm package for the MCP Registry from the plugin build: the same
// bundled server, planner page, hook and offline archive, in the same layout
// (server/ beside web/, hooks/ and experiments/), so nothing resolves differently.
import { readFile,writeFile,mkdir,cp,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const plugin=resolve(root,'plugins/usage-planner');
const out=resolve(root,'output/npm');
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
export const MCP_NAME='io.github.ItsOdeLeo/usage-planner';

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const name of ['server','web','hooks','experiments','LICENSE','THIRD_PARTY_NOTICES.txt'])
  await cp(resolve(plugin,name),resolve(out,name),{recursive:true});
await writeFile(resolve(out,'package.json'),JSON.stringify({
  name:'usage-planner',version:pkg.version,
  description:'MCP server that plans OpenAI Codex usage from your local quota, banked resets and extra-reset forecasts.',
  mcpName:MCP_NAME,type:'module',bin:{usage-planner:'server/usage-planner.mjs'},
  files:['server','web','hooks','experiments','LICENSE','THIRD_PARTY_NOTICES.txt','README.md'],
  engines:{node:'>=20'},license:pkg.license,author:pkg.author,homepage:pkg.homepage,
  repository:pkg.repository,bugs:pkg.bugs,keywords:['mcp','mcp-server','codex','openai-codex','quota','usage-planner']
},null,2)+'\n');
await writeFile(resolve(out,'README.md'),`# usage-planner

MCP server for [Usage Planner](https://usageplanner.com): plans OpenAI Codex usage from your local quota, banked resets and public extra-reset forecasts. Unofficial; not affiliated with OpenAI.

\`\`\`json
{ "mcpServers": { "usage-planner": { "command": "npx", "args": ["-y", "usage-planner"] } } }
\`\`\`

Reading your quota needs a locally installed, signed-in Codex CLI. It never redeems resets or spends credits. In Codex itself, install the plugin instead: \`codex plugin marketplace add ItsOdeLeo/usage-planner\`.

Source, docs and the web planner: https://github.com/ItsOdeLeo/usage-planner
`);
await writeFile(resolve(root,'server.json'),JSON.stringify({
  $schema:'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
  name:MCP_NAME,
  description:'Plan OpenAI Codex usage from local quota, banked resets and extra-reset forecasts.',
  repository:{url:'https://github.com/ItsOdeLeo/usage-planner',source:'github'},
  websiteUrl:'https://usageplanner.com',
  version:pkg.version,
  packages:[{registryType:'npm',identifier:'usage-planner',version:pkg.version,transport:{type:'stdio'}}]
},null,2)+'\n');
console.log(JSON.stringify({out,version:pkg.version,mcpName:MCP_NAME}));
