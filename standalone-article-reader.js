'use strict';
// Read-only standalone story renderer. Never touches edition content or drafts.
// Only the is_public=true row is exposed; the database also enforces this with RLS.
(async function(){
 const root=document.getElementById('standalone-article');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const slug=new URLSearchParams(location.search).get('slug')||'';
 const fail=message=>{root.innerHTML='<h1>ARTICLE UNAVAILABLE</h1><p>'+esc(message)+'</p><a class="readmore" href="index.html">← Back to the front page</a>';};
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>90)return fail('This article link is invalid.');
 try{
  const url=new URL('https://nlckcelwfcoszbvqyeyr.supabase.co/rest/v1/tribune_standalone_articles');
  url.searchParams.set('select','slug,headline,author,summary,story,categories,image_url,published_at');
  url.searchParams.set('slug','eq.'+slug);
  url.searchParams.set('is_public','eq.true');
  url.searchParams.set('limit','1');
  const response=await fetch(url,{headers:{apikey:'sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8'}});
  if(!response.ok)throw new Error('Story service unavailable');
  const records=await response.json(),a=records[0];
  if(!a)return fail('This story has not been published.');
  document.title=a.headline+' | The Fourth & Fuckup Tribune';
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content=a.summary||a.headline;
  // Client-side metadata helps browser sharing but social crawlers generally
  // require separately generated static HTML with server-rendered OG tags.
  for(const [property,value] of [['og:title',a.headline],['og:description',a.summary||a.headline]]){
   const tag=document.querySelector('meta[property="'+property+'"]');if(tag)tag.content=value;
  }
  const paragraphs=String(a.story||'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  const body=paragraphs.map(p=>p.startsWith('## ')?'<h2>'+esc(p.slice(3))+'</h2>':'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
  const safeImage=a.image_url&&/^https:\/\//i.test(a.image_url)?'<figure><img src="'+esc(a.image_url)+'" alt="Article illustration" style="max-width:100%;height:auto" loading="lazy"></figure>':'';
  const date=a.published_at?new Date(a.published_at).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'}):'';
  root.innerHTML='<span class="kicker">'+esc((a.categories||[]).join(' · ')||'TRIBUNE EXCLUSIVE')+'</span><h1>'+esc(a.headline)+'</h1><p class="deck">'+esc(a.summary)+'</p><p class="byline">BY '+esc(a.author)+' · '+esc(date)+'</p>'+safeImage+'<div class="article-body">'+body+'</div><div class="article-share"><span class="kicker">SPREAD THE WORD</span><button type="button" id="standalone-share" class="article-share-button">SHARE THIS STORY ↗</button><p id="share-status" role="status"></p></div><a class="readmore" href="index.html">← Back to the front page</a>';
  document.getElementById('standalone-share').addEventListener('click',async()=>{
   try{if(navigator.share)await navigator.share({title:a.headline,url:location.href});else{await navigator.clipboard.writeText(location.href);document.getElementById('share-status').textContent='Story link copied.';}}
   catch(e){if(e.name!=='AbortError')document.getElementById('share-status').textContent='Copy the address bar URL to share.';}
  });
 }catch(error){console.warn('Standalone story read failed',error);fail('Please try again later.');}
})();
