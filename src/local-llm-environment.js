import { readFile } from 'node:fs/promises';
import { plannerEnv } from './planner-name.js';

// New USAGE_PLANNER_* names and the old CODEX4EVER_* names are both accepted.
const KEYS=new Set(['LLM_MODEL','LLM_BASE_URL','LLM_API_KEY'].flatMap(key=>[`USAGE_PLANNER_${key}`,`CODEX4EVER_${key}`]));

/** Server entry points only. Never import this from browser code or copy the
 * local file into a plugin. Explicit process settings (including '') win.
 */
export async function loadLocalLLMEnvironment({env=process.env,
  file=plannerEnv('ENV_FILE',env)??new URL('../.env.local',import.meta.url)}={}) {
  let text;
  try {text=await readFile(file,'utf8');}
  catch(error) {if(error.code==='ENOENT' && !plannerEnv('ENV_FILE',env))return [];throw new Error('无法读取本机 LLM 配置文件');}
  const loaded=[];
  for(const line of text.split(/\r?\n/)) {
    const match=line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(!match||!KEYS.has(match[1])||env[match[1]]!==undefined)continue;
    let value=match[2];
    if(value.startsWith('"')||value.startsWith("'")) {
      const quote=value[0],end=value.lastIndexOf(quote);
      if(end===0||!/^\s*(?:#.*)?$/.test(value.slice(end+1)))throw new Error('本机 LLM 配置引号格式无效');
      value=value.slice(1,end);
    } else value=value.replace(/\s+#.*$/,'').trim();
    env[match[1]]=value;loaded.push(match[1]);
  }
  return loaded;
}
