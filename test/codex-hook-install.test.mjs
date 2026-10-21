import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp,writeFile,readFile,mkdir } from 'node:fs/promises';
import { installQuotaHook,uninstallQuotaHook } from '../src/codex-hook-install.js';

test('开启提醒只添加 codex4ever 自己的 hook，保留用户原有 hook；关闭只删除自己的；重复开启不重复添加',async()=>{
  const root=await mkdtemp(join(tmpdir(),'codex4ever-install-'));
  const env={CODEX_HOME:join(root,'codex'),CODEX4EVER_HOME:join(root,'c4e')};
  const source=join(root,'bundled.mjs');
  await writeFile(source,'// hook');
  await mkdir(env.CODEX_HOME,{recursive:true});
  const existing={hooks:{UserPromptSubmit:[{hooks:[{type:'command',command:'echo mine'}]}],Stop:[{hooks:[{type:'command',command:'echo stop'}]}]}};
  await writeFile(join(env.CODEX_HOME,'hooks.json'),JSON.stringify(existing));
  const first=await installQuotaHook({scriptSource:source,env});
  assert.equal(first.added,2);
  assert.equal(await readFile(first.script,'utf8'),'// hook','提醒程序复制到固定位置，插件升级后无需重新批准');
  const config=JSON.parse(await readFile(join(env.CODEX_HOME,'hooks.json'),'utf8'));
  assert.equal(config.hooks.UserPromptSubmit[0].hooks[0].command,'echo mine');
  assert.match(config.hooks.UserPromptSubmit[1].hooks[0].command,/c4e\/quota-check\.mjs"$/);
  assert.equal(config.hooks.SessionStart[0].matcher,'startup|resume');
  assert.deepEqual(config.hooks.Stop,existing.hooks.Stop);
  assert.equal((await installQuotaHook({scriptSource:source,env})).alreadyInstalled,true);
  const removed=await uninstallQuotaHook({env});
  assert.equal(removed.removed,2);
  assert.deepEqual(JSON.parse(await readFile(join(env.CODEX_HOME,'hooks.json'),'utf8')),existing,'关闭后恢复原样');
});
