import { readFile } from 'node:fs/promises';

/** Read the palette selected by the page, so checks cannot keep testing an old theme. */
export async function activePaletteSource() {
  const entry=new URL('../../src/styles/theme.css',import.meta.url);
  const css=await readFile(entry,'utf8');
  const imports=[...css.matchAll(/@import\s+['"]([^'"]+)['"]/g)]
    .map(match=>match[1]).filter(path=>path.startsWith('./palettes/'));
  if(imports.length!==1)throw new Error('The style entry must select exactly one palette.');
  return readFile(new URL(imports[0],entry),'utf8');
}

export function paletteValue(source,name) {
  const values=new Map([...source.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(match=>[match[1],match[2].trim()]));
  function resolve(key,seen=new Set()) {
    if(seen.has(key)||!values.has(key))throw new Error(`Invalid palette reference: ${key}`);
    return values.get(key).replace(/var\((--[\w-]+)\)/g,(_,next)=>resolve(next,new Set([...seen,key])));
  }
  return resolve(name.startsWith('--') ? name : '--'+name);
}
