import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://nlckcelwfcoszbvqyeyr.supabase.co','sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8');
const $=id=>document.getElementById(id);let user=null,current=null,articles=[],editions=[],comics=[],puzzles=[];
function roman(n){let s='';for(const [v,t] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=t;n-=v;}return s;}
function proof(){let d=$('date').value;let date=d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase():'CHOOSE PUBLICATION DATE';$('masthead-proof').textContent='VOL. '+roman(Number($('volume').value)||1)+' · NO. '+String(Number($('issue').value)||1).padStart(3,'0')+' — '+date;}
function msg(t){$('status').textContent=t;}
function setSaveFeedback(t){const el=$('edition-save-feedback');if(el)el.textContent=t;}
async function articlesLoad(){let {data,error}=await db.from('tribune_article_drafts').select('id,headline').order('updated_at',{ascending:false});if(error){msg('Could not load articles: '+error.message);return;}articles=data||[];for(let key of ['main','left','right']){let select=$(key),previous=select.value;select.replaceChildren(new Option('— None —',''));for(let a of articles)select.add(new Option(a.headline||'Untitled article',a.id));select.value=articles.some(a=>a.id===previous)?previous:'';}}
function clear(){current=null;queueMicrotask(renderPublishedComicChoices);document.dispatchEvent(new CustomEvent('tribune:edition-layout-switch',{detail:{id:null}}));$('title').value='New Edition';$('volume').value=1;$('issue').value=2;$('date').value='';$('comics').value='';$('crossword').value='';for(let k of ['main','left','right'])$(k).value='';document.querySelectorAll('.comic-check').forEach(c=>c.checked=false);$('puzzle-select').value='';proof();msg('New unsaved edition.');}
async function openEdition(e){current=e.id;queueMicrotask(renderPublishedComicChoices);document.dispatchEvent(new CustomEvent('tribune:edition-layout-switch',{detail:{id:e.id}}));$('title').value=e.title;$('volume').value=e.volume_number;$('issue').value=e.issue_number;$('date').value=e.edition_date;$('main').value=e.main_article_id||'';$('left').value=e.bulletin_left_id||'';$('right').value=e.bulletin_right_id||'';$('comics').value=e.comics_notes||'';$('crossword').value=e.crossword_notes||'';$('puzzle-select').value=e.crossword_draft_id||'';await loadEditionComics(e.id);proof();msg('Opened saved edition.');scrollTo({top:0,behavior:'smooth'});}
async function rehearseEdition(e){
 if(!user)return msg('Sign in to run a private edition rehearsal.');
 if(!confirm('STEP 1 OF 2 — Open a browser-only test publication for '+e.title+'? No public database or live website changes will be made.'))return;
 if(!confirm('STEP 2 OF 2 — FINAL APPROVAL: Display the selected saved draft as a reader-style test issue in this browser? This is NOT a publicly accessible publication.'))return;
 try{
  await previewEdition(e);
  const proof=$('edition-proof');
  proof.scrollIntoView({behavior:'smooth',block:'start'});
  const status=document.createElement('p');
  status.style.cssText='padding:14px;border:2px solid #5d3f22;background:#fff3d9;font-weight:bold';
  status.textContent='BROWSER-ONLY TEST PUBLICATION — '+e.title+'. The reader proof below uses the saved draft. Links inside the existing front-page iframe may still lead to older published content. Nothing was written to public tables.';
  proof.prepend(status);
  msg('Browser-only rehearsal opened for '+e.title+'. Public publication remains locked.');
 }catch(error){msg('Could not open rehearsal: '+(error.message||error));}
}
async function editionsLoad(){let {data,error}=await db.from('tribune_editions').select('*').order('updated_at',{ascending:false});if(error){msg('Could not load editions: '+error.message);return;}editions=data||[];let root=$('saved');root.replaceChildren();if(!editions.length){root.textContent='No saved editions yet.';return;}for(let e of editions){let wrap=document.createElement('div');wrap.className='saved';let title=document.createElement('strong');title.textContent='VOL. '+roman(e.volume_number)+' · NO. '+String(e.issue_number).padStart(3,'0')+' — '+e.title;let info=document.createElement('p');info.textContent=e.edition_date+' · PRIVATE DRAFT';let open=document.createElement('button');open.textContent='OPEN';open.onclick=()=>openEdition(e);let previewButton=document.createElement('button');previewButton.textContent='PREVIEW';previewButton.onclick=()=>previewEdition(e);let rehearse=document.createElement('button');rehearse.textContent='TEST PUBLICATION (THIS BROWSER ONLY)';rehearse.onclick=()=>rehearseEdition(e);let publish=document.createElement('button');publish.textContent='PRODUCTION PUBLISH — LOCKED IN STAGING';publish.onclick=()=>publishPreview(e);let del=document.createElement('button');del.textContent='DELETE';del.onclick=async()=>{if(!confirm('Delete this private edition draft?'))return;let {error}=await db.from('tribune_editions').delete().eq('id',e.id).eq('editor_id',user.id);if(error)return msg(error.message);if(current===e.id)clear();await editionsLoad();msg('Edition deleted.');};wrap.append(title,info,open,previewButton,rehearse,publish,del);root.append(wrap);}}
async function save(){setSaveFeedback('Saving…');if(!user)return msg('Sign in first.');if(!$('date').value)return msg('Choose a publication date.');let ids=['main','left','right'].map(k=>$(k).value).filter(Boolean);if(new Set(ids).size!==ids.length)return msg('Choose a different article for each front-page position.');let v=Number($('volume').value),n=Number($('issue').value);if(!Number.isInteger(v)||v<1||v>999||!Number.isInteger(n)||n<1||n>9999)return msg('Enter a valid volume and issue number.');let row={editor_id:user.id,title:$('title').value.trim(),edition_date:$('date').value,volume_number:v,issue_number:n,main_article_id:$('main').value||null,bulletin_left_id:$('left').value||null,bulletin_right_id:$('right').value||null,comics_notes:$('comics').value,crossword_notes:$('crossword').value,crossword_draft_id:$('puzzle-select').value||null,updated_at:new Date().toISOString()};$('save').disabled=true;let result=current?await db.from('tribune_editions').update(row).eq('id',current).eq('editor_id',user.id).select().single():await db.from('tribune_editions').insert(row).select().single();$('save').disabled=false;if(result.error){setSaveFeedback('Save failed — '+result.error.message);return msg('Save failed: '+result.error.message);}current=result.data.id;document.dispatchEvent(new CustomEvent('tribune:edition-layout-save',{detail:{id:current}}));const assignmentError=await saveEditionComics(current);await editionsLoad();setSaveFeedback(assignmentError?'Saved with comic assignment error: '+assignmentError:'Saved! Private edition draft updated.');msg(assignmentError?'Edition saved, but comic assignment failed: '+assignmentError:'Edition and selected comics saved privately. Nothing has been published.');}
// Private, portable edition package. This action never publishes or changes Supabase.
async function exportReleasePackage(){
 const button=$('export-release-package');
 if(!user)return msg('Sign in to export private edition drafts.');
 if(!current)return msg('Save and reopen an edition before exporting its complete package.');
 const edition=editions.find(x=>x.id===current);
 if(!edition)return msg('Could not locate the saved edition. Refresh Saved Edition Drafts.');
 button.disabled=true;msg('Building private edition package…');
 try{
 const layoutKeys=['tribune-preview-department-headlines','tribune-preview-department-draft-ids','tribune-preview-department-supporting'];
 const stored=JSON.parse(localStorage.getItem('tribune-preview-edition-layout:'+current)||'null');
 const layout={};for(const key of layoutKeys){let value=stored?.[key];if(!value){try{value=JSON.parse(localStorage.getItem(key)||'{}')}catch{value={}}}layout[key]=value;}
 const ids=new Set([edition.main_article_id,edition.bulletin_left_id,edition.bulletin_right_id].filter(Boolean));
 for(const id of Object.values(layout['tribune-preview-department-draft-ids']||{}))if(id)ids.add(id);
 for(const items of Object.values(layout['tribune-preview-department-supporting']||{}))if(Array.isArray(items))for(const a of items)if(a.id)ids.add(a.id);
 const {data:rows,error}=ids.size?await db.from('tribune_article_drafts').select('id,headline,author,summary,story,categories,image_path,placement').in('id',[...ids]):{data:[],error:null};
 if(error)throw Error('Could not retrieve articles: '+error.message);
 const found=new Set((rows||[]).map(a=>a.id)),missing=[...ids].filter(id=>!found.has(id));
 if(missing.length)throw Error(missing.length+' assigned draft(s) are missing. Export stopped so no incomplete package is mistaken for a complete edition.');
 const images={};for(const a of rows||[]){if(!a.image_path)continue;const {data:file,error:imageError}=await db.storage.from('tribune-draft-images').download(a.image_path);if(imageError||!file)throw Error('Could not include image for '+a.headline+': '+(imageError?.message||'file missing'));images[a.id]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);});}
 const {data:links,error:linkError}=await db.from('tribune_edition_comics').select('comic_id').eq('edition_id',current);if(linkError)throw Error('Could not retrieve comic assignments: '+linkError.message);
 const comicIds=(links||[]).map(x=>x.comic_id),comicRows=[];
 if(comicIds.length){const {data:foundComics,error:comicError}=await db.from('tribune_comic_drafts').select('id,series,title,image_path').in('id',comicIds);if(comicError)throw Error('Could not retrieve comics: '+comicError.message);
 for(const c of foundComics||[]){const {data:file,error:imgError}=await db.storage.from('tribune-comic-drafts').download(c.image_path);if(imgError||!file)throw Error('Could not include comic '+c.title);const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Comic image read failed'));reader.readAsDataURL(file);});comicRows.push({...c,image});}
 if(comicRows.length!==comicIds.length)throw Error('One or more selected comics are missing.');
 }
 const payload={format:'tribune-private-edition-release-package',version:1,exported_at:new Date().toISOString(),publication_status:'PRIVATE_UNPUBLISHED',edition,layout,articles:rows,article_images:images,comics:comicRows,comic_order:comicIds,crossword_draft_id:edition.crossword_draft_id||null,notes:'This package is a private export. It does not publish an edition. Crossword content is referenced by ID, not embedded.'};
 const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='tribune-private-edition-'+String(edition.volume_number)+'-'+String(edition.issue_number)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 msg('Private edition package downloaded: '+rows.length+' articles and '+comicRows.length+' comics. Keep the file private; it includes unpublished stories and images. Nothing was published.');
 }catch(e){msg('Export failed: '+(e?.message||e));}finally{button.disabled=false;}
}
$('export-release-package').addEventListener('click',exportReleasePackage);
async function auth(){const {data:{user:u},error}=await db.auth.getUser();user=error?null:u;if(user){let {data:editor,error:ee}=await db.from('tribune_editors').select('user_id').eq('user_id',user.id).maybeSingle();if(ee||!editor){await db.auth.signOut();user=null;}}$('workspace').hidden=!user;$('auth-form').hidden=!!user;$('signout').hidden=!user;$('auth-message').textContent=user?'Signed in as '+user.email:'Sign in with your authorised Tribune email.';if(user){await articlesLoad();await editionsLoad();await loadComics();await loadPuzzles();}}
$('signin').onclick=async()=>{let email=$('email').value.trim();if(!email)return;$('auth-message').textContent='Sending link…';let {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});$('auth-message').textContent=error?'Sign-in failed: '+error.message:'Check your email for the secure sign-in link.';};
$('signout').onclick=async()=>{await db.auth.signOut();user=null;await auth();};
$('save').onclick=save;$('new').onclick=clear;$('refresh-articles').onclick=articlesLoad;for(let id of ['volume','issue','date'])$(id).addEventListener('input',proof);proof();auth();
const comicBucket='tribune-comic-drafts';
let publishedComicLibrary=[];
const reuseKey=id=>'tribune-preview-reused-comics:'+id;
function readReusedComics(id){try{const x=JSON.parse(localStorage.getItem(reuseKey(id))||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function saveReusedComics(id){if(!id)return;const ids=[...document.querySelectorAll('.published-comic-check:checked')].map(x=>x.value);localStorage.setItem(reuseKey(id),JSON.stringify(ids));}
function renderPublishedComicChoices(){
 const root=$('published-comic-library');if(!root)return;
 const selected=new Set(readReusedComics(current));root.replaceChildren();
 for(const c of publishedComicLibrary){
  const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #8b7c63';
  const cb=document.createElement('input');cb.type='checkbox';cb.className='published-comic-check';cb.value=c.id;cb.checked=selected.has(c.id);cb.style.width='auto';
  cb.addEventListener('change',()=>{saveReusedComics(current);document.dispatchEvent(new Event('tribune:comic-selection-updated'));});
  const title=document.createElement('span');title.textContent=c.title+' · '+c.series+' (previously published)';
  row.append(cb,title);root.append(row);
 }
 if(!publishedComicLibrary.length)root.textContent='No previously published comics available.';
 document.dispatchEvent(new Event('tribune:comic-selection-updated'));
}
async function loadPublishedComicChoices(){
 try{
  const {data,error}=await db.from('tribune_live_published_editions').select('content').order('published_at',{ascending:false}).limit(100);
  if(error)throw error;
  const unique=new Map();
  for(const edition of data||[])for(const c of edition.content?.comics||[])if(c.id&&!unique.has(c.id))unique.set(c.id,c);
  publishedComicLibrary=[...unique.values()];renderPublishedComicChoices();
 }catch(e){$('published-comic-library').textContent='Could not load previous comics: '+(e.message||e);}
}
loadPublishedComicChoices();

async function loadComics(){
 const {data,error}=await db.from('tribune_comic_drafts').select('id,series,title,image_path').order('created_at',{ascending:false});
 if(error){$('comic-status').textContent='Could not load comics: '+error.message;return;}
 const selectedBefore=new Set([...document.querySelectorAll('.comic-check:checked')].map(c=>c.value));comics=data||[];const root=$('comic-library');root.replaceChildren();
 if(!comics.length){root.textContent='No uploaded comics yet.';return;}
 for(const c of comics){
  const row=document.createElement('div');row.style.cssText='border-bottom:1px solid #8b7c63;padding:8px 0';
  const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:8px';
  const cb=document.createElement('input');cb.type='checkbox';cb.className='comic-check';cb.value=c.id;cb.checked=selectedBefore.has(c.id);cb.style.width='auto';
  const name=document.createElement('span');name.textContent=c.title+' · '+c.series.replaceAll('-',' ');
  label.append(cb,name);
  const view=document.createElement('button');view.textContent='VIEW';view.type='button';
  view.onclick=async()=>{const {data,error}=await db.storage.from(comicBucket).createSignedUrl(c.image_path,60);if(error)$('comic-status').textContent=error.message;else window.open(data.signedUrl,'_blank','noopener');};
  row.append(label,view);root.append(row);
 }
 if(current&&selectedBefore.size===0)await loadEditionComics(current);
}
async function loadEditionComics(id){
 document.querySelectorAll('.comic-check').forEach(c=>c.checked=false);
 const {data,error}=await db.from('tribune_edition_comics').select('comic_id').eq('edition_id',id);
 if(error){$('comic-status').textContent=error.message;return;}
 const ids=new Set((data||[]).map(c=>c.comic_id));
 document.querySelectorAll('.comic-check').forEach(c=>c.checked=ids.has(c.value));
 document.dispatchEvent(new Event('tribune:comic-selection-updated'));
 renderPublishedComicChoices();
}
async function saveEditionComics(id){
 saveReusedComics(id);
 const {error}=await db.from('tribune_edition_comics').delete().eq('edition_id',id).eq('editor_id',user.id);
 if(error)return error.message;
 const ids=[...document.querySelectorAll('.comic-check:checked')].map(c=>c.value);
 if(!ids.length)return null;
 const result=await db.from('tribune_edition_comics').insert(ids.map(comic_id=>({edition_id:id,comic_id,editor_id:user.id})));
 return result.error?.message||null;
}
$('upload-comic').onclick=async()=>{
 if(!user)return;
 const file=$('comic-file').files[0],title=$('comic-title').value.trim(),series=$('comic-series').value;
 if(!title||!file){$('comic-status').textContent='Enter a title and select an image.';return;}
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10485760){$('comic-status').textContent='Choose a PNG, JPEG or WebP under 10 MB.';return;}
 const button=$('upload-comic');button.disabled=true;$('comic-status').textContent='Uploading…';
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const path=user.id+'/'+crypto.randomUUID()+'.'+ext;
 const {error:uploadError}=await db.storage.from(comicBucket).upload(path,file,{contentType:file.type,upsert:false});
 if(uploadError){button.disabled=false;$('comic-status').textContent=uploadError.message;return;}
 const {data:inserted,error}=await db.from('tribune_comic_drafts').insert({editor_id:user.id,series,title,image_path:path}).select('id').single();
 if(error){await db.storage.from(comicBucket).remove([path]);button.disabled=false;$('comic-status').textContent=error.message;return;}
 $('comic-title').value='';$('comic-file').value='';await loadComics();const newCheckbox=[...document.querySelectorAll('.comic-check')].find(c=>c.value===inserted.id);if(newCheckbox)newCheckbox.checked=true;document.dispatchEvent(new Event('tribune:comic-selection-updated'));button.disabled=false;$('comic-status').textContent='Comic uploaded and selected. You can upload more strips; all checked comics will be saved to this edition.';
};

function validatePuzzle(p){
 if(!p||!Array.isArray(p.grid)||p.grid.length<3||p.grid.length>25||!Array.isArray(p.clues))throw new Error('Expected grid and clues arrays.');
 const n=p.grid.length;if(p.grid.some(row=>typeof row!=='string'||row.length!==n||!/^[A-Z#]+$/.test(row)))throw new Error('Grid must be square (3–25), using uppercase letters and # for blocks.');
 if(!p.clues.length)throw new Error('Add at least one clue.');
 for(const q of p.clues){
  if(!Number.isInteger(q.n)||!Number.isInteger(q.r)||!Number.isInteger(q.c)||!['A','D'].includes(q.d)||typeof q.clue!=='string'||!q.clue.trim()||typeof q.answer!=='string'||!/^[A-Z]+$/.test(q.answer))throw new Error('Each clue needs n, r, c, d, clue and uppercase answer.');
  for(let i=0;i<q.answer.length;i++){const r=q.r+(q.d==='D'?i:0),c=q.c+(q.d==='A'?i:0);if(r<0||c<0||r>=n||c>=n||p.grid[r][c]!==q.answer[i])throw new Error('Clue '+q.n+' does not match the answer grid.');}
 }
 return p;
}
async function loadPuzzles(){
 const {data,error}=await db.from('tribune_crossword_drafts').select('id,title,puzzle').order('created_at',{ascending:false});
 if(error){$('puzzle-status').textContent='Could not load puzzles: '+error.message;return;}
 puzzles=data||[];const select=$('puzzle-select'),old=select.value;select.replaceChildren(new Option('— None —',''));for(const p of puzzles)select.add(new Option(p.title,p.id));select.value=puzzles.some(p=>p.id===old)?old:'';
 if(current){const e=editions.find(e=>e.id===current);if(e)select.value=e.crossword_draft_id||'';}
}
async function addPuzzle(title,puzzle){
 const {error}=await db.from('tribune_crossword_drafts').insert({editor_id:user.id,title,puzzle:validatePuzzle(puzzle)});
 if(error)throw error;await loadPuzzles();$('puzzle-status').textContent='Crossword saved privately. Select it for your edition and save the edition.';
}
$('import-crossword').onclick=async()=>{
 if(!user)return;const button=$('import-crossword');button.disabled=true;
 try{const {data:existing,error}=await db.from('tribune_crossword_drafts').select('id').eq('title','Fourth & Long').maybeSingle();if(error)throw error;if(existing){await loadPuzzles();$('puzzle-select').value=existing.id;$('puzzle-status').textContent='Existing Fourth & Long crossword selected.';return;}
 const response=await fetch('imports/fourth-and-long-crossword.json',{cache:'no-store'});if(!response.ok)throw new Error('Original crossword could not be loaded.');await addPuzzle('Fourth & Long',await response.json());
 const p=puzzles.find(p=>p.title==='Fourth & Long');if(p)$('puzzle-select').value=p.id;
 }catch(e){$('puzzle-status').textContent='Import failed: '+e.message;}finally{button.disabled=false;}
};
$('upload-crossword').onclick=async()=>{
 if(!user)return;const file=$('puzzle-file').files[0],title=$('puzzle-title').value.trim();if(!file||!title){$('puzzle-status').textContent='Enter a title and select a JSON file.';return;}
 if(file.size>100000){$('puzzle-status').textContent='JSON file must be under 100 KB.';return;}
 try{const data=JSON.parse(await file.text());await addPuzzle(title,data);$('puzzle-title').value='';$('puzzle-file').value='';}catch(e){$('puzzle-status').textContent='Import failed: '+e.message;}
};
$('preview-crossword').onclick=async()=>{
 const p=puzzles.find(p=>p.id===$('puzzle-select').value);if(!p){$('puzzle-status').textContent='Select a crossword first.';return;}
 try{
 const response=await fetch('crossword-1.html.html',{cache:'no-store'});if(!response.ok)throw new Error('Could not load crossword player.');
 let html=await response.text();const start=html.indexOf('const DATA='),end=html.indexOf(';',start);
 if(start<0||end<0)throw new Error('Crossword player format changed.');
 html=html.slice(0,start)+'const DATA='+JSON.stringify(p.puzzle)+html.slice(end);
 html=html.replaceAll('Fourth & Long',p.title.replaceAll('&','&amp;').replaceAll('<','&lt;')).replaceAll('Crossword No. 1','Crossword Preview');
 const blob=new Blob([html],{type:'text/html'}),url=URL.createObjectURL(blob);window.open(url,'_blank');
 setTimeout(()=>URL.revokeObjectURL(url),120000);
 }catch(e){$('puzzle-status').textContent=e.message;}
};

$('close-proof').onclick=()=>{$('edition-proof').hidden=true;};
async function previewEdition(edition){
 const root=$('proof-content'),shell=$('edition-proof');root.replaceChildren();shell.hidden=false;
 $('proof-meta').textContent='VOL. '+roman(edition.volume_number)+' · NO. '+String(edition.issue_number).padStart(3,'0')+' · '+new Date(edition.edition_date+'T12:00:00').toLocaleDateString('en-US',{dateStyle:'full'}).toUpperCase();
 const status=document.createElement('p');status.textContent='Assembling private proof…';root.append(status);
 const ids=[edition.main_article_id,edition.bulletin_left_id,edition.bulletin_right_id].filter(Boolean);
 const [articleResult,comicLinks]=await Promise.all([
  ids.length?db.from('tribune_article_drafts').select('id,headline,author,summary,story,categories,image_path').in('id',ids):Promise.resolve({data:[],error:null}),
  db.from('tribune_edition_comics').select('comic_id').eq('edition_id',edition.id)
 ]);
 root.replaceChildren();
 if(articleResult.error||comicLinks.error){const err=document.createElement('p');err.textContent='Could not assemble proof: '+(articleResult.error||comicLinks.error).message;root.append(err);return;}
 const articleMap=new Map((articleResult.data||[]).map(a=>[a.id,a]));
 async function addArticle(id,label){
  const a=articleMap.get(id);if(!a)return;
  const section=document.createElement('section');section.style.cssText='padding:20px 0;border-bottom:2px solid #6b5940';
  const kicker=document.createElement('p');kicker.textContent=label+' · '+(a.categories||[]).join(' / ');kicker.style.cssText='font-weight:bold;letter-spacing:.1em;font-size:12px';
  const title=document.createElement('h2');title.textContent=a.headline;title.style.cssText='font-family:Georgia,serif;font-size:clamp(24px,4vw,36px);margin:8px 0';
  const byline=document.createElement('p');byline.textContent='By '+(a.author||'Tribune Staff');byline.style.fontStyle='italic';
  const summary=document.createElement('p');summary.textContent=a.summary||'';summary.style.fontWeight='bold';
  section.append(kicker,title,byline,summary);
  if(a.image_path){const {data}=await db.storage.from('tribune-draft-images').createSignedUrl(a.image_path,120);if(data){const img=document.createElement('img');img.src=data.signedUrl;img.alt='Article image';img.style.cssText='max-width:100%;max-height:420px;object-fit:contain;display:block;margin:15px auto';section.append(img);}}
  const body=document.createElement('div');body.style.whiteSpace='pre-line';body.textContent=a.story||'';section.append(body);root.append(section);
 }
 await addArticle(edition.main_article_id,'MAIN HEADLINE');
 await addArticle(edition.bulletin_left_id,'BENCHWARMER BULLETIN · LEFT');
 await addArticle(edition.bulletin_right_id,'BENCHWARMER BULLETIN · RIGHT');
 if(!ids.length){const p=document.createElement('p');p.textContent='No front-page articles selected yet.';root.append(p);}
 const comicProof=$('private-comic-proof'),crosswordProof=$('private-crossword-proof');
 comicProof.replaceChildren();crosswordProof.replaceChildren();
 const selectedComicIds=[...(comicLinks.data||[]).map(x=>x.comic_id),...readReusedComics(edition.id)];
 let savedOrder=[];try{savedOrder=JSON.parse(localStorage.getItem('tribune-preview-comic-order')||'[]')}catch{}
 if(!Array.isArray(savedOrder))savedOrder=[];
 const leadId=localStorage.getItem('tribune-preview-featured-comic')||'';
 const orderedComicIds=[...selectedComicIds].sort((a,b)=>{
  if(savedOrder.length){const ai=savedOrder.indexOf(a),bi=savedOrder.indexOf(b);return (ai<0?9999:ai)-(bi<0?9999:bi);}
  return Number(b===leadId)-Number(a===leadId);
 });
 const comicHeading=document.createElement('h3');comicHeading.textContent='THE OBITUARIES — '+orderedComicIds.length+' COMIC(S) SELECTED';comicProof.append(comicHeading);
 if(!orderedComicIds.length){const empty=document.createElement('p');empty.textContent='No comics assigned to this saved draft.';comicProof.append(empty);}
 for(const [i,id] of orderedComicIds.entries()){
  const existing=publishedComicLibrary.find(x=>x.id===id);
  if(existing){
   const title=document.createElement('h4');title.textContent=(i===0?'LEAD · ':'')+existing.title+' · '+existing.series+' (reused)';comicProof.append(title);
   const img=document.createElement('img');img.src=existing.image_url;img.alt=existing.title;img.style.cssText='width:100%;height:auto;max-width:900px;display:block;margin:10px auto 22px';comicProof.append(img);
   continue;
  }
  const c=comics.find(x=>x.id===id);if(!c){const missing=document.createElement('p');missing.textContent='Selected comic '+id+' was not found in the library.';comicProof.append(missing);continue;}
  const title=document.createElement('h4');title.textContent=(i===0?'LEAD · ':'')+c.title+' · '+c.series.replaceAll('-',' ');comicProof.append(title);
  const {data:file,error:imageError}=await db.storage.from(comicBucket).download(c.image_path);
  if(imageError||!file){const warning=document.createElement('p');warning.textContent='Comic image unavailable: '+(imageError?.message||c.title);comicProof.append(warning);continue;}
  const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt=c.title;img.style.cssText='width:100%;height:auto;max-width:900px;display:block;margin:10px auto 22px';img.onload=()=>URL.revokeObjectURL(img.src);comicProof.append(img);
 }
 const crosswordHeading=document.createElement('h3');crosswordHeading.textContent='THE SUNDAY HUDDLE — CROSSWORD';crosswordProof.append(crosswordHeading);
 const selectedPuzzle=puzzles.find(p=>p.id===edition.crossword_draft_id);
 if(selectedPuzzle){
  const title=document.createElement('p');title.textContent='Selected puzzle: '+selectedPuzzle.title;crosswordProof.append(title);
  try{
   const response=await fetch('crossword-1.html.html',{cache:'no-store'});if(!response.ok)throw Error('Crossword player unavailable');
   let html=await response.text(),start=html.indexOf('const DATA='),end=html.indexOf(';',start);
   if(start<0||end<0)throw Error('Crossword player format changed');
   html=html.slice(0,start)+'const DATA='+JSON.stringify(selectedPuzzle.puzzle)+html.slice(end);
   html=html.replaceAll('Fourth & Long',selectedPuzzle.title.replaceAll('&','&amp;').replaceAll('<','&lt;')).replaceAll('Crossword No. 1','Crossword Preview');
   const frame=document.createElement('iframe');frame.title='Private crossword proof: '+selectedPuzzle.title;frame.style.cssText='width:100%;height:750px;border:2px solid #473b2c;background:#f5ecd5';frame.srcdoc=html;crosswordProof.append(frame);
  }catch(error){const warning=document.createElement('p');warning.textContent='Could not show crossword: '+error.message;crosswordProof.append(warning);}
 }else{const empty=document.createElement('p');empty.textContent='No crossword assigned to this saved draft.';crosswordProof.append(empty);}
 const comicIds=(comicLinks.data||[]).map(x=>x.comic_id);
 if(comicIds.length){
  const heading=document.createElement('h2');heading.textContent='THE OBITUARY PAGES · COMICS';root.append(heading);
  for(const id of comicIds){const c=comics.find(x=>x.id===id);if(!c)continue;const title=document.createElement('h3');title.textContent=c.title;root.append(title);
   const {data}=await db.storage.from(comicBucket).createSignedUrl(c.image_path,120);
   if(data){const img=document.createElement('img');img.src=data.signedUrl;img.alt=c.title;img.style.cssText='width:100%;height:auto;margin:10px 0';root.append(img);}
  }
 }
 if(edition.crossword_draft_id){const p=puzzles.find(x=>x.id===edition.crossword_draft_id);if(p){const heading=document.createElement('h2');heading.textContent='THE SUNDAY HUDDLE · '+p.title;root.append(heading);const note=document.createElement('p');note.textContent='Playable crossword assigned. Open this edition in the manager and click PLAY PRIVATE PREVIEW to test the puzzle.';root.append(note);}}
 if(edition.comics_notes||edition.crossword_notes){const p=document.createElement('p');p.textContent=[edition.comics_notes,edition.crossword_notes].filter(Boolean).join(' · ');root.append(p);}
 const foot=document.createElement('p');foot.textContent='END OF PRIVATE PROOF · THE LIVE TRIBUNE IS UNCHANGED';foot.style.cssText='text-align:center;border-top:3px double #473b2c;padding:20px';root.append(foot);
 const articleFor=id=>articleMap.get(id)||null;
 const lead=articleFor(edition.main_article_id),left=articleFor(edition.bulletin_left_id),right=articleFor(edition.bulletin_right_id);
 const withPhoto=async a=>{if(!a)return null;const result={...a};if(a.image_path){const {data:file,error}=await db.storage.from('tribune-draft-images').download(a.image_path);if(file&&!error){result.preview_image_url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read image'));reader.readAsDataURL(file);});}else result.image_error=error?.message||'Image unavailable';}return result;};
 const payload={volume:edition.volume_number,issue:edition.issue_number,date:edition.edition_date,main:await withPhoto(lead),left:await withPhoto(left),right:await withPhoto(right)};
 try{sessionStorage.setItem('tribune_editor_front_proof',JSON.stringify(payload));$('real-front-proof').src='index.html?editor-proof=1&proof-version='+Date.now();}catch(e){const warning=document.createElement('p');warning.textContent='Full front-page preview unavailable: '+e.message;root.append(warning);}
 shell.scrollIntoView({behavior:'smooth',block:'start'});
}

async function publishPreview(e){
 alert('STAGING SAFETY LOCK: Production publication is disabled until the upgrade is approved and deployed. No edition has been published.');
 return;
 if(!user)return;
 // Production-only publication path. Staging safety lock above prevents writes.
 if(!e.main_article_id)return msg('Choose and save a main headline before preview publication.');

 if(!confirm('STEP 1 OF 2 — Review publication: Volume '+roman(e.volume_number)+', Issue '+e.issue_number+' ('+e.edition_date+'). This will make the selected articles, comics and crossword publicly accessible on the PREVIEW SITE. Continue to final approval?'))return;
 if(!confirm('STEP 2 OF 2 — FINAL APPROVAL: Publish this edition to the PUBLIC PREVIEW ARCHIVE now? This is a real public preview publication, not a private draft. The live fourthandfuckup.com newspaper will not change.'))return;
 const ids=[e.main_article_id,e.bulletin_left_id,e.bulletin_right_id].filter(Boolean);
 if(!ids.length)return msg('Select at least one article before publishing to the preview archive.');
 const {data,error}=await db.from('tribune_article_drafts').select('id,headline,author,summary,story,categories,image_path').in('id',ids);
 if(error)return msg('Publishing failed: '+error.message);
 for(const a of data||[]){if(!a.image_path)continue;const {data:file,error:downloadError}=await db.storage.from('tribune-draft-images').download(a.image_path);if(downloadError||!file)return msg('Publishing stopped: could not copy image for '+a.headline+'. '+(downloadError?.message||''));const extension=(a.image_path.split('.').pop()||'webp').toLowerCase();const safeExt=['jpg','jpeg','png','webp','gif'].includes(extension)?extension:'webp';const path=e.id+'/'+a.id+'.'+safeExt;const {error:uploadError}=await db.storage.from('tribune-published-images').upload(path,file,{upsert:true,contentType:file.type||'image/'+(safeExt==='jpg'?'jpeg':safeExt)});if(uploadError)return msg('Publishing stopped: could not publish image for '+a.headline+'. '+uploadError.message);a.preview_image_url=db.storage.from('tribune-published-images').getPublicUrl(path).data.publicUrl+'?v='+Date.now();delete a.image_path;}
 const {data:comicLinks,error:comicLinkError}=await db.from('tribune_edition_comics').select('comic_id').eq('edition_id',e.id);if(comicLinkError)return msg('Publishing stopped: '+comicLinkError.message);
 const comicIds=(comicLinks||[]).map(x=>x.comic_id);let publishedComics=[...publishedComicLibrary.filter(c=>readReusedComics(e.id).includes(c.id)).map(c=>({id:c.id,series:c.series,title:c.title,image_url:c.image_url}))];
 if(comicIds.length){const {data:comicRows,error:comicError}=await db.from('tribune_comic_drafts').select('id,series,title,image_path').in('id',comicIds);if(comicError)return msg('Publishing stopped: '+comicError.message);if((comicRows||[]).length!==comicIds.length)return msg('Publishing stopped: a selected comic could not be found.');for(const c of comicRows){const {data:file,error:downloadError}=await db.storage.from('tribune-comic-drafts').download(c.image_path);if(downloadError||!file)return msg('Publishing stopped: comic image unavailable: '+c.title+'. '+(downloadError?.message||''));const ext=(c.image_path.split('.').pop()||'png').toLowerCase();const safeExt=['png','jpg','jpeg','webp'].includes(ext)?ext:'png';const path='comics/'+c.id+'.'+safeExt;const {error:uploadError}=await db.storage.from('tribune-published-images').upload(path,file,{upsert:true,contentType:file.type||'image/png'});if(uploadError)return msg('Publishing stopped: comic image upload failed: '+uploadError.message);publishedComics.push({id:c.id,series:c.series,title:c.title,image_url:db.storage.from('tribune-published-images').getPublicUrl(path).data.publicUrl+'?v='+Date.now()});}}
 let publishedCrossword=null;
 if(e.crossword_draft_id){const {data:p,error:puzzleError}=await db.from('tribune_crossword_drafts').select('id,title,puzzle').eq('id',e.crossword_draft_id).single();if(puzzleError||!p)return msg('Publishing stopped: selected crossword could not be loaded. '+(puzzleError?.message||''));publishedCrossword={id:p.id,title:p.title,puzzle:p.puzzle};}
 const order=(()=>{try{return JSON.parse(localStorage.getItem('tribune-preview-comic-order')||'[]')}catch{return []}})();if(Array.isArray(order)&&order.length)publishedComics.sort((a,b)=>{const ia=order.indexOf(a.id),ib=order.indexOf(b.id);return (ia<0?9999:ia)-(ib<0?9999:ib)});
 const byId=new Map((data||[]).map(a=>[a.id,a]));
 const layoutKeys=['tribune-preview-department-headlines','tribune-preview-department-draft-ids','tribune-preview-department-supporting'];
 const layout={};let snapshot=null;try{snapshot=JSON.parse(localStorage.getItem('tribune-preview-edition-layout:'+e.id)||'null')}catch{}
 for(const key of layoutKeys){try{layout[key]=snapshot?.[key]||JSON.parse(localStorage.getItem(key)||'{}')}catch{layout[key]={}}}
 const departmentIds=[...new Set([...Object.values(layout['tribune-preview-department-draft-ids']||{}),...Object.values(layout['tribune-preview-department-supporting']||{}).flatMap(items=>Array.isArray(items)?items.map(x=>x.id):[])].filter(Boolean))];
 let departmentArticles=[];if(departmentIds.length){const {data:rows,error:deptError}=await db.from('tribune_article_drafts').select('id,headline,author,summary,story,categories,image_path').in('id',departmentIds);if(deptError)return msg('Publishing stopped: '+deptError.message);if((rows||[]).length!==departmentIds.length)return msg('Publishing stopped: missing assigned department article');departmentArticles=rows||[];for(const a of departmentArticles){if(!a.image_path)continue;const {data:file,error:downloadError}=await db.storage.from('tribune-draft-images').download(a.image_path);if(downloadError||!file)return msg('Publishing stopped: department image missing for '+a.headline);const path='departments/'+e.id+'/'+a.id+'.'+(a.image_path.split('.').pop()||'webp');const {error:uploadError}=await db.storage.from('tribune-published-images').upload(path,file,{upsert:true,contentType:file.type});if(uploadError)return msg('Publishing stopped: '+uploadError.message);a.preview_image_url=db.storage.from('tribune-published-images').getPublicUrl(path).data.publicUrl+'?v='+Date.now();delete a.image_path;}}
 const content={main:byId.get(e.main_article_id)||null,left:byId.get(e.bulletin_left_id)||null,right:byId.get(e.bulletin_right_id)||null,comics:publishedComics,crossword:publishedCrossword,department_layout:layout,department_articles:departmentArticles};
 if(!content.main)return msg('A main headline is required before publishing.');
 const {data:existing,error:lookupError}=await db.from('tribune_live_published_editions').select('id').eq('source_edition_id',e.id).maybeSingle();
 if(lookupError)return msg('Publishing failed: '+lookupError.message);
 if(existing&&!confirm('This edition is already in the preview archive. Replace its published text with the current draft?'))return;
 const row={source_edition_id:e.id,edition_date:e.edition_date,volume_number:e.volume_number,issue_number:e.issue_number,title:e.title,content,published_by:user.id,published_at:new Date().toISOString()};
 const result=existing?await db.from('tribune_live_published_editions').update(row).eq('id',existing.id):await db.from('tribune_live_published_editions').insert(row);
 if(result.error)return msg('Publishing failed: '+result.error.message);
 msg('Published articles, '+publishedComics.length+' comic(s), and '+(publishedCrossword?'a crossword':'no crossword')+' to the PRODUCTION PUBLICATION (only after final authorization).');
}

// Authenticated, private department proof. Never publishes, uploads, or saves a draft.
document.addEventListener('tribune:private-department-proof',async event=>{
 const root=$('department-private-proof-content');if(!root)return;
 root.hidden=false;root.replaceChildren();
 if(!user){root.textContent='Sign in to Frank’s Office to inspect private article drafts.';return;}
 const ids=[...new Set(event.detail.ids)].filter(Boolean);
 const heading=document.createElement('h3');heading.textContent='CONFIDENTIAL · '+String(event.detail.department).toUpperCase()+' · PRIVATE ARTICLE PROOF';root.append(heading);
 const loading=document.createElement('p');loading.textContent='Loading complete article drafts…';root.append(loading);
 const {data,error}=await db.from('tribune_article_drafts').select('id,headline,author,summary,story,categories,image_path').in('id',ids);
 loading.remove();if(error){root.append(document.createTextNode('Could not load private drafts: '+error.message));return;}
 const byId=new Map((data||[]).map(a=>[a.id,a]));
 for(const [index,id] of ids.entries()){
 const a=byId.get(id);if(!a)continue;
 const section=document.createElement('article');section.style.cssText='padding:18px 0;border-bottom:2px solid #786347';
 const kicker=document.createElement('p');kicker.textContent=(index?'SUPPORTING STORY '+index:'FEATURED STORY')+' · '+(a.categories||[]).join(' / ');section.append(kicker);
 const h=document.createElement('h2');h.textContent=a.headline||'Untitled';section.append(h);
 const byline=document.createElement('p');byline.textContent='By '+(a.author||'Tribune Staff');section.append(byline);
 if(a.image_path){const {data:file,error:imgError}=await db.storage.from('tribune-draft-images').download(a.image_path);if(file&&!imgError){const url=URL.createObjectURL(file),img=document.createElement('img');img.src=url;img.alt='Private draft article image';img.style.cssText='max-width:100%;max-height:350px;object-fit:contain';img.onload=()=>URL.revokeObjectURL(url);section.append(img);}else{const note=document.createElement('p');note.textContent='Image unavailable in private proof.';section.append(note);}}
 const summary=document.createElement('p');summary.textContent=a.summary||'';summary.style.fontWeight='bold';section.append(summary);
 const body=document.createElement('div');body.textContent=a.story||'';body.style.whiteSpace='pre-wrap';section.append(body);
 root.append(section);
 }
 if(data?.length){
  const proofArticles=[];
  for(const id of ids){const a=byId.get(id);if(!a)continue;const item={id,headline:a.headline,author:a.author,summary:a.summary,story:a.story,categories:a.categories};
   if(a.image_path){const {data:file,error:imageError}=await db.storage.from('tribune-draft-images').download(a.image_path);if(file&&!imageError){item.image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);});}}
   proofArticles.push(item);
  }
  const open=document.createElement('button');open.type='button';open.textContent='VIEW THESE ARTICLES IN THE NEWSPAPER DEPARTMENT LAYOUT';open.onclick=()=>{
   try{sessionStorage.setItem('tribune-private-department-proof',JSON.stringify({department:event.detail.department,articles:proofArticles}));location.href='department-private-proof.html';}
   catch(err){const p=document.createElement('p');p.textContent='Could not open department newspaper proof: '+err.message;root.append(p);}
  };root.prepend(open);
 }
 if(!data?.length)root.append(document.createTextNode('No matching private drafts found.'));
 root.scrollIntoView({behavior:'smooth',block:'start'});
});
