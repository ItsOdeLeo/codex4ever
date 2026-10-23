// Local data folder: ~/.usage-planner, or the old ~/.codex4ever while only that
// one exists, so reminders set up before the rename keep their state.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { plannerEnv } from './planner-name.js';

export function plannerHome(env=process.env) {
  const configured=plannerEnv('HOME',env);
  if(configured)return configured;
  const next=join(homedir(),'.usage-planner'),old=join(homedir(),'.codex4ever');
  return !existsSync(next)&&existsSync(old) ? old : next;
}
