import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://nlckcelwfcoszbvqyeyr.supabase.co','sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8');
const $=id=>document.getElementById(id);let user=null,current=null,articles=[],editions=[],comics=[],puzzles=[];
function roman(n){let s='';for(const [v,t] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=t;n-=v;}return s;}
function proof(){let d=$('date').value;let date=d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase():'CHOOSE PUBLICATION DATE';$('masthead-proof').textContent='VOL. '+roman(Number($('volume').value)||1)+' · NO. '+String(Number($('issue').value)||1).padStart(3,'0')+' — '+date;}
function msg(t){$('status').textContent=t;}
async function articlesLoad(){let {data,error}=await db.from('tribune_article_drafts').select('id,headline').order('updated_at',{ascending:false});if(error){msg('Could not load articles: '+error.message);return;}articles=data||[];for(let key of ['main','left','right']){let select=$(key),previous=select.value;select.replaceChildren(new Option('— None —',''));for(let a of articles)select.add(new Option(a.headline||'Untitled article',a.id));select.value=articles.some(a=>a.id===previous)?previous:'';}}
function clear(){current=null;$('title').value='New Edition';$('volume').value=1;$('issue').value=2;$('date').value='';$('comics').value='';$('crossword').value='';for(let k of ['main','left','right'])$(k).value='';document.querySelectorAll('.comic-check').forEach(c=>c.checked=false);$('puzzle-select').value='';proof();msg('New unsaved edition.');}
async function openEdition(e){current=e.id;$('title').value=e.title;$('volume').value=e.volume_number;$('issue').value=e.issue_number;$('date').value=e.edition_date;$('main').value=e.main_article_id||'';$('left').value=e.bulletin_left_id||'';$('right').value=e.bulletin_right_id||'';$('comics').value=e.comics_notes||'';$('crossword').value=e.crossword_notes||'';$('puzzle-select').value=e.crossword_draft_id||'';await loadEditionComics(e.id);proof();msg('Opened saved edition.');scrollTo({top:0,behavior:'smooth'});}
async function editionsLoad(){let {data,error}=await db.from('tribune_editions').select('*').order('updated_at',{ascending:false});if(error){msg('Could not load editions: '+error.message);return;}editions=data||[];let root=$('saved');root.replaceChildren();if(!editions.length){root.textContent='No saved editions yet.';return;}for(let e of editions){let wrap=document.createElement('div');wrap.className='saved';let title=document.createElement('strong');title.textContent='VOL. '+roman(e.volume_number)+' · NO. '+String(e.issue_number).padStart(3,'0')+' — '+e.title;let info=document.createElement('p');info.textContent=e.edition_date+' · PRIVATE DRAFT';let open=document.createElement('button');open.textContent='OPEN';open.onclick=()=>openEdition(e);let previewButton=document.createElement('button');previewButton.textContent='PREVIEW';previewButton.onclick=()=>previewEdition(e);let publish=document.createElement('button');publish.textContent='PUBLISH TO LIVE NEWSPAPER';publish.onclick=()=>publishPreview(e);let del=document.createElement('button');del.textContent='DELETE';del.onclick=async()=>{if(!confirm('Delete this private edition draft?'))return;let {error}=await db.from('tribune_editions').delete().eq('id',e.id).eq('editor_id',user.id);if(error)return msg(error.message);if(current===e.id)clear();await editionsLoad();msg('Edition deleted.');};wrap.append(title,info,open,previewButton,publish,del);root.append(wrap);}}
async function save(){if(!user)return msg('Sign in first.');if(!$('date').value)return msg('Choose a publication date.');let ids=['main','left','right'].map(k=>$(k).value).filter(Boolean);if(new Set(ids).size!==ids.length)return msg('Choose a different article for each front-page position.');let v=Number($('volume').value),n=Number($('issue').value);if(!Number.isInteger(v)||v<1||v>999||!Number.isInteger(n)||n<1||n>9999)return msg('Enter a valid volume and issue number.');let row={editor_id:user.id,title:$('title').value.trim(),edition_date:$('date').value,volume_number:v,issue_number:n,main_article_id:$('main').value||null,bulletin_left_id:$('left').value||null,bulletin_right_id:$('right').value||null,comics_notes:$('comics').value,crossword_notes:$('crossword').value,crossword_draft_id:$('puzzle-select').value||null,updated_at:new Date().toISOString()};$('save').disabled=true;let result=current?await db.from('tribune_editions').update(row).eq('id',current).eq('editor_id',user.id).select().single():await db.from('tribune_editions').insert(row).select().single();$('save').disabled=false;if(result.error)return msg('Save failed: '+result.error.message);current=result.data.id;const assignmentError=await saveEditionComics(current);await editionsLoad();msg(assignmentError?'Edition saved, but comic assignment failed: '+assignmentError:'Edition and selected comics saved privately. Nothing has been published.');}
async function auth(){const {data:{user:u},error}=await db.auth.getUser();user=error?null:u;if(user){let {data:editor,error:ee}=await db.from('tribune_editors').select('user_id').eq('user_id',user.id).maybeSingle();if(ee||!editor){await db.auth.signOut();user=null;}}$('workspace').hidden=!user;$('auth-form').hidden=!!user;$('signout').hidden=!user;$('auth-message').textContent=user?'Signed in as '+user.email:'Sign in with your authorised Tribune email.';if(user){await articlesLoad();await editionsLoad();await loadComics();await loadPuzzles();}}
$('signin').onclick=async()=>{let email=$('email').value.trim();if(!email)return;$('auth-message').textContent='Sending link…';let {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});$('auth-message').textContent=error?'Sign-in failed: '+error.message:'Check your email for the secure sign-in link.';};
$('signout').onclick=async()=>{await db.auth.signOut();user=null;await auth();};
$('save').onclick=save;$('new').onclick=clear;$('refresh-articles').onclick=articlesLoad;for(let id of ['volume','issue','date'])$(id).addEventListener('input',proof);proof();auth();
const comicBucket='tribune-comic-drafts';
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
}
async function saveEditionComics(id){
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
 $('comic-title').value='';$('comic-file').value='';await loadComics();const newCheckbox=[...document.querySelectorAll('.comic-check')].find(c=>c.value===inserted.id);if(newCheckbox)newCheckbox.checked=true;button.disabled=false;$('comic-status').textContent='Comic uploaded and selected. You can upload more strips; all checked comics will be saved to this edition.';
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
 const withPhoto=async a=>{if(!a)return null;const result={...a};if(a.image_path){const {data,error}=await db.storage.from('tribune-draft-images').createSignedUrl(a.image_path,600);if(data&&!error)result.preview_image_url=data.signedUrl;}return result;};
 const payload={volume:edition.volume_number,issue:edition.issue_number,date:edition.edition_date,main:await withPhoto(lead),left:await withPhoto(left),right:await withPhoto(right)};
 try{sessionStorage.setItem('tribune_editor_front_proof',JSON.stringify(payload));$('real-front-proof').src='index.html?editor-proof=1&proof-version='+Date.now();}catch(e){const warning=document.createElement('p');warning.textContent='Full front-page preview unavailable: '+e.message;root.append(warning);}
 shell.scrollIntoView({behavior:'smooth',block:'start'});
}

async function publishPreview(e){
 if(!user)return;
 if(!confirm('PUBLISH TO THE LIVE FOURTHANDFUCKUP.COM NEWSPAPER? This replaces the public homepage and publishes all selected articles, comics and crossword. This is NOT a test. Continue?'))return;
 const ids=[e.main_article_id,e.bulletin_left_id,e.bulletin_right_id].filter(Boolean);
 if(!ids.length)return msg('Select at least one article before publishing to the live newspaper.');
 const {data,error}=await db.from('tribune_article_drafts').select('id,headline,author,summary,story,categories,image_path').in('id',ids);
 if(error)return msg('Publishing failed: '+error.message);
 for(const a of data||[]){if(!a.image_path)continue;const {data:file,error:downloadError}=await db.storage.from('tribune-draft-images').download(a.image_path);if(downloadError||!file)return msg('Publishing stopped: could not copy image for '+a.headline+'. '+(downloadError?.message||''));const extension=(a.image_path.split('.').pop()||'webp').toLowerCase();const safeExt=['jpg','jpeg','png','webp','gif'].includes(extension)?extension:'webp';const path='live/'+e.id+'/'+a.id+'.'+safeExt;const {error:uploadError}=await db.storage.from('tribune-published-images').upload(path,file,{upsert:true,contentType:file.type||'image/'+(safeExt==='jpg'?'jpeg':safeExt)});if(uploadError)return msg('Publishing stopped: could not publish image for '+a.headline+'. '+uploadError.message);a.preview_image_url=db.storage.from('tribune-published-images').getPublicUrl(path).data.publicUrl+'?v='+Date.now();delete a.image_path;}
 const {data:comicLinks,error:comicLinkError}=await db.from('tribune_edition_comics').select('comic_id').eq('edition_id',e.id);if(comicLinkError)return msg('Publishing stopped: '+comicLinkError.message);
 const comicIds=(comicLinks||[]).map(x=>x.comic_id);let publishedComics=[];
 if(comicIds.length){const {data:comicRows,error:comicError}=await db.from('tribune_comic_drafts').select('id,series,title,image_path').in('id',comicIds);if(comicError)return msg('Publishing stopped: '+comicError.message);if((comicRows||[]).length!==comicIds.length)return msg('Publishing stopped: a selected comic could not be found.');for(const c of comicRows){const {data:file,error:downloadError}=await db.storage.from('tribune-comic-drafts').download(c.image_path);if(downloadError||!file)return msg('Publishing stopped: comic image unavailable: '+c.title+'. '+(downloadError?.message||''));const ext=(c.image_path.split('.').pop()||'png').toLowerCase();const safeExt=['png','jpg','jpeg','webp'].includes(ext)?ext:'png';const path='live-comics/'+c.id+'.'+safeExt;const {error:uploadError}=await db.storage.from('tribune-published-images').upload(path,file,{upsert:true,contentType:file.type||'image/png'});if(uploadError)return msg('Publishing stopped: comic image upload failed: '+uploadError.message);publishedComics.push({id:c.id,series:c.series,title:c.title,image_url:db.storage.from('tribune-published-images').getPublicUrl(path).data.publicUrl+'?v='+Date.now()});}}
 let publishedCrossword=null;
 if(e.crossword_draft_id){const {data:p,error:puzzleError}=await db.from('tribune_crossword_drafts').select('id,title,puzzle').eq('id',e.crossword_draft_id).single();if(puzzleError||!p)return msg('Publishing stopped: selected crossword could not be loaded. '+(puzzleError?.message||''));publishedCrossword={id:p.id,title:p.title,puzzle:p.puzzle};}
 const byId=new Map((data||[]).map(a=>[a.id,a]));
 const content={main:byId.get(e.main_article_id)||null,left:byId.get(e.bulletin_left_id)||null,right:byId.get(e.bulletin_right_id)||null,comics:publishedComics,crossword:publishedCrossword};
 if(!content.main)return msg('A main headline is required before publishing.');
 const {data:existing,error:lookupError}=await db.from('tribune_live_published_editions').select('id').eq('source_edition_id',e.id).maybeSingle();
 if(lookupError)return msg('Publishing failed: '+lookupError.message);
 if(existing&&!confirm('This edition is already in the live newspaper. Replace its published text with the current draft?'))return;
 const row={source_edition_id:e.id,edition_date:e.edition_date,volume_number:e.volume_number,issue_number:e.issue_number,title:e.title,content,published_by:user.id,published_at:new Date().toISOString()};
 const result=existing?await db.from('tribune_live_published_editions').update(row).eq('id',existing.id):await db.from('tribune_live_published_editions').insert(row);
 if(result.error)return msg('Publishing failed: '+result.error.message);
 msg('Published articles, '+publishedComics.length+' comic(s), and '+(publishedCrossword?'a crossword':'no crossword')+' to the LIVE newspaper.');
}
