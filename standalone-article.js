import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://nlckcelwfcoszbvqyeyr.supabase.co','sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8');
const root=document.getElementById('standalone'),id=new URLSearchParams(location.search).get('id');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!id||!/^[0-9a-f-]{36}$/i.test(id)){root.textContent='Invalid article link.';}else{
 const {data:a,error}=await db.from('tribune_live_standalone_articles').select('id,headline,author,summary,story,categories,image_url,published_at').eq('id',id).maybeSingle();
 if(error||!a){root.textContent='Article unavailable.';}else{
 document.title=a.headline+' | The Fourth & Fuckup Tribune';
 const date=new Date(a.published_at).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});
 const paragraphs=String(a.story||'').split(/\n\s*\n/).filter(Boolean).map(p=>p.startsWith('## ')?'<h2>'+esc(p.slice(3))+'</h2>':'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
 root.innerHTML='<span class="kicker">TRIBUNE EXCLUSIVE · '+esc((a.categories||[]).join(' · '))+'</span><h1>'+esc(a.headline)+'</h1><p class="deck">'+esc(a.summary)+'</p><p class="byline">BY '+esc(a.author)+' · '+esc(date)+'</p>'+(a.image_url?'<figure style="margin:20px 0"><img src="'+esc(a.image_url)+'" alt="Illustration for '+esc(a.headline)+'" style="width:100%;height:auto;max-height:650px;object-fit:contain"></figure>':'')+'<div class="article-body">'+paragraphs+'</div><div class="article-share"><button type="button" id="shareStandalone">SHARE THIS INVESTIGATION ↗</button><span id="shareStatus"></span></div>';
 document.getElementById('shareStandalone').onclick=async()=>{try{if(navigator.share)await navigator.share({title:a.headline,url:location.href});else{await navigator.clipboard.writeText(location.href);document.getElementById('shareStatus').textContent=' Link copied.';}}catch(e){if(e.name!=='AbortError')document.getElementById('shareStatus').textContent=' Copy the link from your address bar.';}};
 }
}