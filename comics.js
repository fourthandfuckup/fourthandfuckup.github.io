'use strict';
const comics=window.TRIBUNE_COMICS||[];
const root=document.getElementById('comicApp');
const params=new URLSearchParams(location.search);
const series=comics.find(s=>s.id===params.get('series'));
const volume=Number(params.get('volume')||1);
const archiveMode=params.get('view')==='archives';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(id,v)=>'comics.html?series='+encodeURIComponent(id)+(v?'&volume='+v:'');
const archiveLink='comics.html?view=archives';
const home='<a class="comic-back" href="'+archiveLink+'">← Comic Archives</a>';
const newest=s=>[...s.issues].sort((a,b)=>b.volume-a.volume)[0];
if(!series && archiveMode){
  root.innerHTML='<p class="comics-eyebrow">PERMANENT COLLECTIONS</p><h1 class="comics-title">COMIC ARCHIVES</h1><p class="comics-intro">Choose a series to browse every volume, beginning with Volume 1.</p><div class="comic-series-grid">'+comics.map(s=>'<article class="comic-series-card"><span class="kicker">COMIC SERIES · '+s.issues.length+' ISSUE'+(s.issues.length===1?'':'S')+'</span><h2>'+esc(s.title)+'</h2><p>'+esc(s.description)+'</p><a href="'+link(s.id,1)+'">START FROM VOLUME 1 →</a></article>').join('')+'</div><p><a class="comic-back" href="comics.html">← Read the latest comics</a></p>';
}else if(!series){
  root.innerHTML='<p class="comics-eyebrow">WALTER DEADMAN · EDITOR</p><h1 class="comics-title">THE OBITUARY PAGES</h1><p class="comics-intro">Fresh from the Tribune’s funny pages. The latest issue of every comic series, right here in the paper.</p>'+comics.map(s=>{const i=newest(s);return '<section class="comic-reader comic-feature"><h2>'+esc(s.title)+'</h2><p class="comic-meta">VOLUME '+i.volume+' · “'+esc(i.title)+'”</p><figure><img src="'+esc(i.image)+'" alt="'+esc(s.title)+' volume '+i.volume+': '+esc(i.title)+' — six-panel comic" loading="lazy"><figcaption>Volume '+i.volume+' · '+esc(i.title)+'</figcaption></figure><p><a href="'+link(s.id,i.volume)+'">Read this issue and browse the series →</a></p></section>';}).join('')+'<p><a class="comic-back" href="'+archiveLink+'">Browse the permanent Comic Archives →</a></p><section class="comic-feature" id="sunday-huddle"><p class="comics-eyebrow">THE SUNDAY HUDDLE · WEEKLY CROSSWORD</p><h2 class="comics-title">FOURTH &amp; LONG</h2><p class="comics-intro">Crossword No. 1 · 15 × 15 · NFL &amp; fantasy football. Play here or open the full-size puzzle.</p><iframe title="The Sunday Huddle Crossword No. 1 — Fourth &amp; Long" src="crossword-1.html.html" style="display:block;width:100%;height:920px;border:2px solid #51402a;background:#f5ecd5" loading="lazy"></iframe><p><a href="crossword-1.html.html">Open full-size crossword →</a> · <a href="crossword-archives.html">Crossword Archives →</a></p></section>';
}else{
  const issues=[...series.issues].sort((a,b)=>a.volume-b.volume),issue=issues.find(i=>i.volume===volume);
  if(!issue){root.innerHTML=home+'<h1 class="comics-title">'+esc(series.title)+'</h1><p class="comic-unavailable">That volume is not in the archive yet.</p>';}
  else{
    const ix=issues.indexOf(issue),prev=issues[ix-1],next=issues[ix+1];
    root.innerHTML=home+'<p class="comics-eyebrow">THE OBITUARY PAGES · PERMANENT ARCHIVE</p><h1 class="comics-title">'+esc(series.title)+'</h1><p class="comics-intro">VOLUME '+issue.volume+' · “'+esc(issue.title)+'”</p><section class="comic-reader"><figure><img src="'+esc(issue.image)+'" alt="'+esc(series.title)+' volume '+issue.volume+': '+esc(issue.title)+' — six-panel comic" loading="eager"><figcaption>Volume '+issue.volume+' · '+esc(issue.title)+'</figcaption></figure><nav class="comic-nav" aria-label="Comic issue navigation"><span>'+(prev?'<a href="'+link(series.id,prev.volume)+'">← Previous comic</a>':'Volume 1 · First issue')+'</span><span>'+(next?'<a href="'+link(series.id,next.volume)+'">Next comic →</a>':'Latest issue')+'</span></nav></section><h2>All volumes of '+esc(series.title)+'</h2><ol class="comic-issue-list">'+issues.map(i=>'<li><a href="'+link(series.id,i.volume)+'">Volume '+i.volume+': '+esc(i.title)+'</a>'+(i.volume===volume?' · Currently reading':'')+'</li>').join('')+'</ol>';
  }
}
