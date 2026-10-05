const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content', 'posts');
const DIST = path.join(ROOT, 'dist');

function rm(p){ if(fs.existsSync(p)) fs.rmSync(p,{recursive:true,force:true}); }
function mkdir(p){ fs.mkdirSync(p,{recursive:true}); }
function esc(s=''){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function slug(s=''){ return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

function parsePost(file){
  const raw=fs.readFileSync(file,'utf8').replace(/\r/g,'');
  const parts=raw.split(/^---\s*$/m);
  const fm=(parts.length>=3?parts[1]:'');
  const body=(parts.length>=3?parts.slice(2).join('---\n'):raw).trim();
  const meta={};
  fm.split('\n').forEach(line=>{
    const m=line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if(!m) return;
    let v=m[2].trim();
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    meta[m[1]]=v;
  });
  return {meta,body,file};
}

function md(s){
  const lines=s.split(/\n+/);
  let out='', inList=false;
  for(const line0 of lines){
    const line=line0.trim();
    if(!line){ if(inList){out+='</ul>';inList=false;} continue; }
    if(line.startsWith('### ')){out+=`<h3>${inline(line.slice(4))}</h3>`;continue;}
    if(line.startsWith('## ')){out+=`<h2>${inline(line.slice(3))}</h2>`;continue;}
    if(line.startsWith('# ')){out+=`<h2>${inline(line.slice(2))}</h2>`;continue;}
    if(line.startsWith('- ')){if(!inList){out+='<ul>';inList=true;}out+=`<li>${inline(line.slice(2))}</li>`;continue;}
    if(inList){out+='</ul>';inList=false;}
    out+=`<p>${inline(line)}</p>`;
  }
  if(inList) out+='</ul>';
  return out;
}
function inline(s){
  let x=esc(s);
  x=x.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="post-image">');
  x=x.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  x=x.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  x=x.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return x;
}
function layout(title, body, article=false){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — Nōte</title><meta name="description" content="${esc(article ? title : 'Nōte — Ideas worth keeping.')}"><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/">ZOTONYE</a><nav><a class="note-nav" href="/">Nōte</a></nav></header>${body}<footer>ZOTONYE · NIGERIA · 2026 · INFORMATION IN MOTION</footer></body></html>`;
}

rm(DIST); mkdir(DIST); mkdir(path.join(DIST,'posts'));
fs.copyFileSync(path.join(ROOT,'style.css'),path.join(DIST,'style.css'));
const files=fs.readdirSync(CONTENT).filter(f=>f.endsWith('.md'));
const posts=files.map(f=>parsePost(path.join(CONTENT,f))).sort((a,b)=>String(b.meta.date).localeCompare(String(a.meta.date)));

for(const p of posts){
  const slugName=slug(p.meta.title);
  const article=`<main class="article-wrap"><h1>${esc(p.meta.title)}</h1><p class="article-intro">${esc(p.meta.excerpt||'')}</p><p class="date">${esc(String(p.meta.date||'').toUpperCase())}</p><article>${md(p.body)}</article><a class="back" href="/">← Back to Nōte</a></main>`;
  const dir=path.join(DIST,slugName); mkdir(dir);
  fs.writeFileSync(path.join(dir,'index.html'),layout(p.meta.title,article,true));
}

const latest=posts[0];
let story='';
if(latest){
 const s=slug(latest.meta.title);
 story=`<a class="story" href="/${s}/"><div><p class="story-meta">${esc((latest.meta.category||'ARTICLE').toUpperCase())} · ${esc(String(latest.meta.date||'').toUpperCase())}</p><h2>${esc(latest.meta.title)}</h2><p class="story-dek">${esc(latest.meta.excerpt||'')}</p></div><span class="arrow">↗</span></a>`;
}
const home=`<main><section class="intro"><h1>Ideas worth keeping.</h1><p class="dek">Stories and perspectives on how we live and move.</p></section><section class="latest"><div class="section-label">LATEST</div>${story}</section></main>`;
fs.writeFileSync(path.join(DIST,'index.html'),layout('Nōte',home,false));
