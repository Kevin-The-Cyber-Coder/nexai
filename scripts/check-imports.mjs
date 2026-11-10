import fs from 'fs'; import path from 'path';
const dir='frontend/src/views';
for(const f of fs.readdirSync(dir)){
  const src=fs.readFileSync(path.join(dir,f),'utf8');
  const imports=new Set();
  for(const m of src.matchAll(/import\s*\{([^}]+)\}\s*from/g)) m[1].split(',').forEach(s=>imports.add(s.trim().split(/\s+as\s+/).pop()));
  const defined=new Set([...src.matchAll(/(?:function|const|let)\s+([A-Z][A-Za-z0-9_]*)/g)].map(m=>m[1]));
  const used=new Set([...src.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map(m=>m[1]));
  const missing=[...used].filter(n=>!imports.has(n)&&!defined.has(n));
  if(missing.length) console.log(f+': '+missing.join(', '));
}
