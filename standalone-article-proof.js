'use strict';
// Private, read-only article proof. Receives only a draft snapshot in this tab's
// sessionStorage. No database reads or writes and no publishing side effects.
const target=document.getElementById('standalone-proof');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let draft=null;
try{draft=JSON.parse(sessionStorage.getItem('tribune_standalone_proof')||'null');}catch(_){}
if(!draft||!draft.headline||!draft.story){
 target.innerHTML='<h1>NO ARTICLE PROOF AVAILABLE</h1><p>Open a story in the Article Editor and select Preview Standalone Article.</p><a href="article-editor.html">Return to Frank’s Office →</a>';
}else{
 document.title=draft.headline+' | PRIVATE PROOF | The Fourth & Fuckup Tribune';
 const paragraphs=String(draft.story).split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
 const body=paragraphs.map(p=>p.startsWith('## ')?'<h2>'+escapeHtml(p.slice(3))+'</h2>':'<p>'+escapeHtml(p).replace(/\n/g,'<br>')+'</p>').join('');
 const photo=draft.imageDataUrl&&/^data:image\/(png|jpeg|webp);base64,/.test(draft.imageDataUrl)?'<figure><img style="max-width:100%;height:auto" src="'+escapeHtml(draft.imageDataUrl)+'" alt="Article illustration"></figure>':'';
 target.innerHTML='<div class="editor-note" style="padding:12px;border:2px dashed #8b3426"><strong>PRIVATE PROOF — NOT PUBLISHED.</strong> This story has not been added to the newspaper.</div><span class="kicker">'+escapeHtml((draft.categories||[]).join(' · ')||'TRIBUNE EXCLUSIVE')+'</span><h1>'+escapeHtml(draft.headline)+'</h1><p class="deck">'+escapeHtml(draft.summary)+'</p><p class="byline">BY '+escapeHtml(draft.author||'TRIBUNE STAFF')+' · UNPUBLISHED DRAFT</p>'+photo+'<div class="article-body">'+body+'</div><a class="readmore" href="article-editor.html">← Back to the editor</a>';
}
