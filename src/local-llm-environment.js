import { readFile } from 'node:fs/promises';

const KEYS=new Set(['CODEX4EVER_LLM_MODEL','CODEX4EVER_LLM_BASE_URL','CODEX4EVER_LLM_API_KEY']);

/** Server entry points only. Never import this from browser code or copy the
 * local file into a plugin. Explicit process settings (including '') win.
 */
export async function loadLocalLLMEnvironment({env=process.env,
  file=env.CODEX4EVER_ENV_FILE??new URL('../.env.local',import.meta.url)}={}) {
  let text;
  try {text=await readFile(file,'utf8');}
  catch(error) {if(error.code==='ENOENT' && !env.CODEX4EVER_ENV_FILE)return [];throw new Error('无法读取本机 LLM 配置文件');}
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
