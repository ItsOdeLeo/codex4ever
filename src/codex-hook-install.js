// Register the quota reminder as a user-level Codex hook. Codex versions that
// do not load plugin-bundled hooks still load ~/.codex/hooks.json; Codex then
// asks the user to trust the hook once. Only codex4ever's own entries are
// added or removed; every other hook is preserved.
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { homedir } from 'node:os';

const MARKER='quota-check.mjs';
const EVENTS=[['SessionStart','startup|resume'],['UserPromptSubmit',null]];

export const codexHome=(env=process.env)=>env.CODEX_HOME??join(homedir(),'.codex');
// A stable copy, so plugin updates neither break the path nor need re-trust.
export const stableHookScript=(env=process.env)=>join(env.CODEX4EVER_HOME??join(homedir(),'.codex4ever'),'quota-check.mjs');

const ours=handler=>typeof handler?.command==='string'&&handler.command.includes(MARKER);

async function readHooks(file) {
  try {return JSON.parse(await readFile(file,'utf8'));}
  catch(error) {if(error.code==='ENOENT')return {hooks:{}};throw new Error(`无法读取 ${file}，未做任何修改`);}
}

/** Copy the bundled hook script and add codex4ever's hook entries. */
export async function installQuotaHook({scriptSource,env=process.env}={}) {
  const script=stableHookScript(env),file=join(codexHome(env),'hooks.json');
  await mkdir(dirname(script),{recursive:true});
  await copyFile(scriptSource,script);
  const config=await readHooks(file);
  config.hooks??={};
  const handler={type:'command',command:`node "${script}"`,timeout:20};
  let added=0;
  for(const [event,matcher] of EVENTS) {
    const groups=config.hooks[event]??=[];
    if(groups.some(group=>group.hooks?.some(ours)))continue;
    groups.push({...(matcher ? {matcher} : {}),hooks:[handler]});added++;
  }
  if(added) {
    await mkdir(dirname(file),{recursive:true});
    await writeFile(file,JSON.stringify(config,null,2)+'\n');
  }
  return {file,script,added,alreadyInstalled:!added};
}

/** Remove codex4ever's hook entries; leave everything else untouched. */
export async function uninstallQuotaHook({env=process.env}={}) {
  const file=join(codexHome(env),'hooks.json');
  const config=await readHooks(file);
  let removed=0;
  for(const [event,groups] of Object.entries(config.hooks??{})) {
    const kept=[];
    for(const group of groups) {
      const handlers=(group.hooks??[]).filter(handler=>!ours(handler));
      removed+=(group.hooks?.length??0)-handlers.length;
      if(handlers.length)kept.push({...group,hooks:handlers});
    }
    if(kept.length)config.hooks[event]=kept;else delete config.hooks[event];
  }
  if(removed)await writeFile(file,JSON.stringify(config,null,2)+'\n');
  return {file,removed};
}
