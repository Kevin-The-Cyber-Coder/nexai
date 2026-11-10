import fs from 'fs';
import path from 'path';
const dir='frontend/src';
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.(jsx|js)$/.test(e.name)) files.push(p);}})(dir);
const all=new Set();
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  const set=new Set();
  const re=/className=(?:"([^"]*)"|\{([^}]*)\})/g; let m;
  while((m=re.exec(src))){
    const chunk=(m[1]||m[2]||'');
    for(const s of chunk.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)){ for(const w of (s[1]||s[2]||s[3]||'').split(/\s+/)){ if(/^[a-z][a-z0-9-]*$/.test(w)){set.add(w);all.add(w);} } }
    for(const w of chunk.split(/[^a-zA-Z0-9_-]+/)){ if(/^[a-z][a-z0-9-]*$/.test(w) && !/^(true|false|null|undefined|cls|i|index|size|name|variant|tone|active|on|open|loading|has|is)$/.test(w)) { set.add(w); all.add(w); } }
  }
  console.log('### '+f+' ('+set.size+')');
  console.log([...set].sort().join(' '));
}
console.log('### ALL ('+all.size+')');
console.log([...all].sort().join(' '));
