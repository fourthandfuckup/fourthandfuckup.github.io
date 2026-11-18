import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://nlckcelwfcoszbvqyeyr.supabase.co','sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8');
const $=id=>document.getElementById(id),names=['Sleeping Giant League','Westfort Dynasty','Benchwarmer Bulletin',"Frank's Desk",'Wall of Shame'],slots={main:'MAIN HEADLINE','bulletin-left':'BENCHWARMER BULLETIN — LEFT','bulletin-right':'BENCHWARMER BULLETIN — RIGHT',sleeping:'SLEEPING GIANT — LEAGUE DESK',westfort:'WESTFORT DYNASTY — LEAGUE DESK',shame:'WALL OF SHAME',none:'CATEGORY PAGES ONLY'};
let sourceArticleId=null;let previousPlacement=null;let user=null,current=null,drafts=[],photoUrl=null,savedImagePath=null,pendingImage=null; const bucket='tribune-draft-images';
for(const name of names){const label=document.createElement('label');label.className='check';const input=document.createElement('input');input.type='checkbox';input.value=name;label.append(input,document.createTextNode(name));$('categories').append(label);}
function notice(s){$('status').textContent=s;}
function values(){return {headline:$('headline').value,author:$('author').value,summary:$('summary').value,story:$('story').value,categories:[...$('categories').querySelectorAll('input:checked')].map(x=>x.value),placement:$('placement').value};}
function preview(){const d=values();$('preview-headline').textContent=d.headline||'Your headline appears here';$('preview-byline').textContent='By '+(d.author||'Tribune Staff');$('preview-summary').textContent=d.summary;$('preview-story').textContent=d.story||'Your article appears here as you type.';$('preview-categories').textContent=d.categories.join(' • ');$('preview-place').textContent=slots[d.placement]||'CATEGORY PAGES ONLY';updateNewspaperPreview();}
async function showSavedImage(path){if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;pendingImage=null;$('photo').value='';savedImagePath=path||null;$('preview-photo').hidden=true;if(!path)return;const {data,error}=await db.storage.from(bucket).download(path);if(error){notice('Article loaded, but image could not be downloaded: '+error.message);return;}photoUrl=URL.createObjectURL(data);$('preview-photo').src=photoUrl;$('preview-photo').hidden=false;updateNewspaperPreview();}
async function load(d){sourceArticleId=d.source_article_id||null;current=d.id;for(const f of ['headline','author','summary','story','placement'])$(f).value=d[f]||'';for(const c of $('categories').querySelectorAll('input'))c.checked=(d.categories||[]).includes(c.value);await showSavedImage(d.image_path);preview();notice('Cloud draft loaded with its saved image.');}
function clearPhoto(){if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;pendingImage=null;savedImagePath=null;$('photo').value='';$('preview-photo').hidden=true;}
function render(){const root=$('drafts');root.replaceChildren();if(!drafts.length){root.textContent='No cloud drafts saved yet.';return;}for(const d of drafts){const item=document.createElement('div');item.style.marginBottom='12px';const title=document.createElement('strong');title.textContent=d.headline||'Untitled article';const actions=document.createElement('div');const open=document.createElement('button');open.type='button';open.textContent='EDIT';open.addEventListener('click',()=>load(d));const del=document.createElement('button');del.type='button';del.textContent='DELETE';del.addEventListener('click',async()=>{if(!confirm('Permanently delete this cloud draft?'))return;const {error}=await db.from('tribune_prod_article_drafts').delete().eq('id',d.id);if(error){notice('Delete failed: '+error.message);return;}if(d.image_path)await db.storage.from(bucket).remove([d.image_path]);if(current===d.id){current=null;clearPhoto();}await refresh();notice('Cloud draft deleted.');});actions.append(open,del);item.append(title,actions);root.append(item);}}
async function refresh(){if(!user)return;const {data,error}=await db.from('tribune_prod_article_drafts').select('id,headline,author,summary,story,categories,placement,image_path,source_article_id,updated_at').order('updated_at',{ascending:false});if(error){notice('Could not load drafts: '+error.message);return;}drafts=data||[];render();}
async function signedIn(){const {data:{user:u},error}=await db.auth.getUser();user=error?null:u;let authorized=false;if(user){const {data:member,error:memberError}=await db.from('tribune_editors').select('user_id').eq('user_id',user.id).maybeSingle();authorized=!memberError&&!!member;}if(user&&!authorized){await db.auth.signOut();user=null;}$('editor-workspace').hidden=!user;$('editor-logout').hidden=!user;$('editor-login').hidden=!!user;$('editor-email').hidden=!!user;document.querySelector('label[for="editor-email"]').hidden=!!user;$('editor-auth-intro').hidden=!!user;$('editor-auth-status').textContent=user?'Signed in as '+user.email:authorized===false&&u?'This account is not authorized for the newsroom.':'Sign in with your authorized editor email. No password required.';if(user)await refresh();else{drafts=[];current=null;render();}updateNewspaperPreview();}
$('editor-login').addEventListener('click',async()=>{const email=$('editor-email').value.trim();if(!email)return $('editor-auth-status').textContent='Enter your editor email first.';$('editor-auth-status').textContent='Sending secure sign-in link...';const {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});$('editor-auth-status').textContent=error?'Sign-in request failed: '+error.message:'Check your email for a secure sign-in link. No password needed.';});
$('editor-logout').addEventListener('click',async()=>{await db.auth.signOut();await signedIn();});
document.querySelectorAll('#editor-workspace input,#editor-workspace textarea,#editor-workspace select').forEach(x=>x.addEventListener('input',preview));
$('photo').addEventListener('change',()=>{if(photoUrl)URL.revokeObjectURL(photoUrl);const f=$('photo').files[0];pendingImage=f||null;photoUrl=f?URL.createObjectURL(f):null;$('preview-photo').hidden=!photoUrl;if(photoUrl)$('preview-photo').src=photoUrl;updateNewspaperPreview();});
$('save').addEventListener('click',async()=>{if(!user)return notice('Please sign in first.');const d={...values(),editor_id:user.id,image_path:savedImagePath,source_article_id:sourceArticleId,updated_at:new Date().toISOString()};if(current)d.id=current;notice('Saving cloud draft...');if(pendingImage){if(!['image/jpeg','image/png','image/webp'].includes(pendingImage.type)||pendingImage.size>5242880){notice('Choose a JPG, PNG, or WebP image under 5 MB.');return;}const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[pendingImage.type];const path=user.id+'/'+crypto.randomUUID()+'.'+ext;const {error:uploadError}=await db.storage.from(bucket).upload(path,pendingImage,{contentType:pendingImage.type,upsert:false});if(uploadError){notice('Image upload failed: '+uploadError.message);return;}d.image_path=path;}const {data,error}=await db.from('tribune_prod_article_drafts').upsert(d).select('id').single();if(error){if(pendingImage&&d.image_path!==savedImagePath)await db.storage.from(bucket).remove([d.image_path]);notice('Cloud save failed: '+error.message);return;}const previous=savedImagePath;savedImagePath=d.image_path;pendingImage=null;if(previous&&previous!==savedImagePath)await db.storage.from(bucket).remove([previous]);current=data.id;await refresh();notice('Draft and image saved securely to the newsroom cloud. Nothing published.');});
$('new').addEventListener('click',()=>{current=null;sourceArticleId=null;for(const f of ['headline','summary','story'])$(f).value='';$('author').value='Frank “The Hammer” Haggerty';$('placement').value='main';for(const c of $('categories').querySelectorAll('input'))c.checked=false;clearPhoto();preview();notice('New blank article.');});
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(values(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='tribune-article-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Draft exported as JSON.');});

let publishBusy=false;
$('publish-single').addEventListener('click',async()=>{
 if(publishBusy)return;
 if(!user||!current)return notice('Save the draft before publishing.');
 if(pendingImage)return notice('Save your new image before publishing.');
 const d=drafts.find(a=>a.id===current);
 if(!d)return notice('Reload and save this draft before publishing.');
 const v=values();
 if(['headline','author','summary','story'].some(k=>String(v[k]).trim()!==String(d[k]||'').trim())||JSON.stringify(v.categories)!==JSON.stringify(d.categories||[])||v.placement!==d.placement)return notice('You have unsaved edits. Save the draft before publishing.');
 if(!d.headline?.trim()||!d.story?.trim())return notice('A headline and full article are required.');
 if(!confirm('STEP 1 OF 2: Publish "'+d.headline+'" as a standalone public article? This will NOT publish a new newspaper edition.'))return;
 if(!confirm('STEP 2 OF 2: FINAL APPROVAL — Make this article LIVE on fourthandfuckup.com now?'))return;
 publishBusy=true;$('publish-single').disabled=true;notice('Publishing standalone article...');
 try{
  let image_url=null;
  if(d.image_path){
   const {data:file,error:downloadError}=await db.storage.from(bucket).download(d.image_path);
   if(downloadError||!file)throw Error('Could not read article image: '+(downloadError?.message||'No file'));
   const ext=(d.image_path.split('.').pop()||'webp').toLowerCase();
   const path='standalone/'+d.id+'.'+(['png','jpg','jpeg','webp'].includes(ext)?ext:'webp');
   const {error:uploadError}=await db.storage.from('tribune-published-images').upload(path,file,{upsert:true,contentType:file.type||'image/webp'});
   if(uploadError)throw Error('Could not publish image: '+uploadError.message);
   image_url=db.storage.from('tribune-published-images').getPublicUrl(path).data.publicUrl+'?v='+Date.now();
  }
  const payload={source_draft_id:d.id,headline:d.headline,author:d.author||'Tribune Staff',summary:d.summary||'',story:d.story,categories:d.categories||[],placement:d.placement||'none',image_url,published_by:user.id,published_at:new Date().toISOString()};
  const {data:existing,error:checkError}=await db.from('tribune_live_standalone_articles').select('id').eq('source_draft_id',d.id).maybeSingle();
  if(checkError)throw Error(checkError.message);
  const result=existing?await db.from('tribune_live_standalone_articles').update(payload).eq('id',existing.id).select('id').single():await db.from('tribune_live_standalone_articles').insert(payload).select('id').single();
  if(result.error)throw Error(result.error.message);
  notice('LIVE: Article published without changing the newspaper edition. Open: '+location.origin+'/standalone-article.html?id='+result.data.id);
  const link=document.createElement('a');link.href='standalone-article.html?id='+encodeURIComponent(result.data.id);link.target='_blank';link.rel='noopener';link.textContent=' VIEW PUBLISHED ARTICLE ↗';$('status').append(link);
 }catch(e){notice('Publication failed: '+e.message);}
 finally{publishBusy=false;$('publish-single').disabled=false;}
});

preview();await signedIn();

// Read-only front-page placement mock-up. All modifications are confined to this iframe.
function updateNewspaperPreview(){const panel=$('page-preview-panel'),frame=$('newspaper-frame'),d=values();panel.hidden=!user;if(!user)return;const doc=frame.contentDocument;if(!doc||!doc.querySelector('.front-layout'))return;if(previousPlacement!==d.placement){previousPlacement=d.placement;frame.contentWindow.location.reload();return;}doc.querySelectorAll('.editor-preview-marker').forEach(el=>el.classList.remove('editor-preview-marker'));const text=(el,value)=>{if(el)el.textContent=value;};const marker=el=>{if(el){el.classList.add('editor-preview-marker');el.style.outline='3px dashed #8b3426';el.style.outlineOffset='4px';}};const title=d.headline||'YOUR HEADLINE WILL APPEAR HERE',summary=d.summary||'Your short teaser will appear here.';const img=photoUrl;
if(d.placement==='main'){const root=doc.querySelector('.front-layout > section');text(root?.querySelector('.lead-headline'),title);text(root?.querySelector('.deck'),summary);text(root?.querySelector('.byline'),'BY '+(d.author||'TRIBUNE STAFF')+' · UNPUBLISHED DRAFT');text(root?.querySelector('.article-tease'),(d.story||'Your story will appear here.').slice(0,350).replace(/\\s+\\S*$/,'')+'…');const art=root?.querySelector('.lead-graphic');if(art&&img){const photo=doc.createElement('img');photo.src=img;photo.alt='Draft article image';photo.style.cssText='width:100%;height:100%;object-fit:contain;filter:grayscale(1) sepia(.2)';art.replaceChildren(photo);}// The public investigation page is still the old static story. In this private
// iframe preview, intercept its link and show the current saved/editor draft.
const link=root?.querySelector('a[href*="investigation"],a[href*="seventy"],a[href*="case"]')||root?.querySelector('a.readmore');
if(link){link.addEventListener('click',event=>{event.preventDefault();showFullDraftInPreview(frame,d,img);},{once:true});}
marker(root?.querySelector('.lead-headline'));$('page-preview-note').textContent='Main headline preview — click the case-file link to read this draft, not the old published investigation.';
}else if(d.placement==='bulletin-left'||d.placement==='bulletin-right'){const cards=doc.querySelectorAll('.front-investigations .front-case'),card=cards[d.placement==='bulletin-left'?0:1];if(card){text(card.querySelector('h3'),title);text(card.querySelector('p'),summary);text(card.querySelector('.kicker'),(d.categories[0]||'BENCHWARMER BULLETIN').toUpperCase()+' · UNPUBLISHED DRAFT');card.removeAttribute('href');marker(card);} $('page-preview-note').textContent='Benchwarmer Bulletin '+(d.placement==='bulletin-left'?'left':'right')+' preview — the opposite investigation stays unchanged.';
}else{$('page-preview-note').textContent='This selection belongs on a category page, not a replaceable front-page feature. The permanent league navigation blocks remain unchanged.';}
}
$('newspaper-frame').addEventListener('load',updateNewspaperPreview);


// Private iframe-only full-story view; never writes to the public site.
function showFullDraftInPreview(frame,d,img){
 const doc=frame.contentDocument;if(!doc)return;
 const shell=doc.createElement('main');shell.style.cssText='max-width:780px;margin:24px auto;padding:30px;background:#f6e8c6;color:#23190f;font-family:Georgia,serif;line-height:1.65';
 const back=doc.createElement('button');back.textContent='← BACK TO NEWSPAPER PREVIEW';back.style.cssText='cursor:pointer;padding:10px;margin-bottom:24px;background:#80291d;color:white;border:0;font-weight:bold';back.addEventListener('click',()=>frame.contentWindow.location.reload());shell.append(back);
 const heading=doc.createElement('h1');heading.textContent=d.headline;heading.style.cssText='font-size:clamp(30px,5vw,52px);line-height:1.1';shell.append(heading);
 const byline=doc.createElement('p');byline.textContent='BY '+(d.author||'TRIBUNE STAFF')+' · UNPUBLISHED DRAFT';shell.append(byline);
 if(img){const photo=doc.createElement('img');photo.src=img;photo.alt='Article illustration';photo.style.cssText='max-width:100%;display:block;margin:20px auto';shell.append(photo);}
 const body=doc.createElement('div');body.style.cssText='font-size:20px;overflow-wrap:anywhere';
 for(const part of (d.story||'').split(/\n\s*\n/)){const p=doc.createElement(/^CHAPTER (ONE|TWO|THREE|FOUR|FIVE|SIX):/.test(part)?'h2':/^[A-Z0-9 ’'?!.,—-]+$/.test(part.trim())&&part.length<100?'h3':'p');p.textContent=part;p.style.margin='0 0 1.2em';body.append(p);}
 shell.append(body);doc.body.replaceChildren(shell);doc.body.style.cssText='margin:0;background:#e5d09d';frame.style.height='1250px';
}

// One-time import of the existing front-page investigation. Never changes published files.
$('import-74').addEventListener('click',async()=>{
if(!user)return notice('Sign in before importing.');
if((current||$('headline').value.trim()||$('story').value.trim())&&!confirm('Open the existing $74 investigation? Unsaved changes in the editor will be replaced.'))return;
const button=$('import-74');button.disabled=true;notice('Checking for an existing imported copy...');
try{
const {data:existing,error:findError}=await db.from('tribune_prod_article_drafts').select('*').eq('source_article_id','seventy-four-dollar-man').maybeSingle();
if(findError)throw new Error('Import lookup failed: '+findError.message);
if(existing){await load(existing);notice('Opened the existing imported $74 investigation. Edit and save this same draft.');return;}
const response=await fetch('imports/seventy-four-dollar-man.json?v=2',{cache:'no-store'});
if(!response.ok)throw new Error('Could not load the article ('+response.status+')');
const article=await response.json();
if(article.id!=='seventy-four-dollar-man'||!Array.isArray(article.body))throw new Error('Article data is incomplete');
current=null;sourceArticleId=article.id;clearPhoto();
$('headline').value=article.title;$('author').value=article.author;$('summary').value=article.deck;
$('story').value=article.body.join('\n\n');$('placement').value='main';
for(const c of $('categories').querySelectorAll('input'))c.checked=c.value==='Sleeping Giant League';
preview();notice('Original short investigation loaded. Click SAVE DRAFT to save a private editable copy. Nothing has been published.');
}catch(error){notice('Import failed: '+error.message);}
finally{button.disabled=false;}
});
