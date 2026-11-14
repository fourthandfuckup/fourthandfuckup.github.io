import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase=createClient('https://nlckcelwfcoszbvqyeyr.supabase.co','sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8');
const $=id=>document.getElementById(id),notice=$('office-notice'),login=$('office-login'),dashboard=$('office-dashboard');
const labels={new:'New',investigating:'Under Investigation',awaiting_evidence:'Awaiting Evidence',approved:'Approved',declined:'Declined',published:'Published'};
let cases=[];
function message(t){notice.textContent=t;notice.hidden=false;}
function node(tag,txt,cls){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;}
async function refresh(){const {data,error}=await supabase.from('tribune_cases').select('id,created_at,report_type,league_name,team_name,story,contact_email,status,decline_reason,editor_notes').order('created_at',{ascending:false});if(error){message('Unable to load case files: '+error.message);return;}cases=data||[];render();}
function render(){const counts={};for(const c of cases)counts[c.status]=(counts[c.status]||0)+1;const stats=$('office-stats');stats.replaceChildren();for(const k of ['new','investigating','awaiting_evidence','approved','declined','published']){const b=node('div');b.append(node('strong',String(counts[k]||0)),node('span',labels[k]));stats.append(b);}const holder=$('office-cases');holder.replaceChildren();const filter=$('office-filter').value;const visible=cases.filter(c=>filter==='all'||c.status===filter);if(!visible.length){holder.append(node('p',cases.length?'No cases match this filter.':'No submissions yet.','office-empty'));return;}for(const c of visible){const card=node('article',undefined,'office-case');card.append(node('div',`${c.report_type==='dominance'?'ABSOLUTE DOMINANCE':'FUCKUP'} • ${new Date(c.created_at).toLocaleDateString()} • ${labels[c.status]}`,'kicker'),node('h3',c.team_name),node('p','LEAGUE: '+c.league_name,'office-meta'),node('p',c.story));card.append(node('p','Contact: '+(c.contact_email||'Not provided'),'office-meta'));const evidenceArea=node('div',undefined,'office-evidence-list');card.append(evidenceArea);loadEvidence(c.id,evidenceArea);if(c.decline_reason)card.append(node('p','Decline reason: '+c.decline_reason,'office-meta'));const lab=node('label','CASE STATUS');const sel=node('select');for(const [value,label] of Object.entries(labels)){const o=node('option',label);o.value=value;o.selected=value===c.status;sel.append(o);}const reason=node('input');reason.placeholder='Reason for declining (required if declined)';reason.value=c.decline_reason||'';reason.setAttribute('aria-label','Reason for declining');const save=node('button','SAVE EDITORIAL DECISION');save.type='button';const feedback=node('p',undefined,'office-meta');save.addEventListener('click',async()=>{if(sel.value==='declined'&&!reason.value.trim()){feedback.textContent='Please enter a reason before declining.';return;}save.disabled=true;const {error}=await supabase.from('tribune_cases').update({status:sel.value,decline_reason:sel.value==='declined'?reason.value.trim():null,updated_at:new Date().toISOString()}).eq('id',c.id);save.disabled=false;if(error){feedback.textContent='Could not save: '+error.message;}else{feedback.textContent='Decision saved.';await refresh();}});card.append(lab,sel,reason,save,feedback);holder.append(card);}}
async function loadEvidence(caseId,holder){const {data,error}=await supabase.from('tribune_evidence').select('file_name,storage_path').eq('case_id',caseId);if(error){holder.textContent='Evidence metadata unavailable.';return;}if(!data?.length){holder.textContent='No screenshots attached.';return;}holder.append(node('strong','CONFIDENTIAL SCREENSHOT EVIDENCE'));const list=node('ul');for(const f of data){const li=node('li');const btn=node('button','VIEW: '+f.file_name);btn.type='button';btn.addEventListener('click',async()=>{btn.disabled=true;const {data:link,error:linkError}=await supabase.storage.from('Tribune Evidence').createSignedUrl(f.storage_path,60);btn.disabled=false;if(linkError||!link?.signedUrl){alert('Could not open this private evidence file.');return;}window.open(link.signedUrl,'_blank','noopener,noreferrer');});li.append(btn);list.append(li);}holder.append(list);}
async function check(){if(location.protocol==='file:'){message('Local preview only. The secure sign-in will work after this page is deployed on the Tribune website and its redirect address is configured in Supabase.');login.hidden=true;return;}const {data:{session},error}=await supabase.auth.getSession();if(error||!session){message('Private newsroom. Sign in with your authorised editor email.');login.hidden=false;dashboard.hidden=true;return;}const {data:member,error:memberError}=await supabase.from('tribune_editors').select('user_id').eq('user_id',session.user.id).maybeSingle();if(memberError||!member){message('This account is not authorised to access the Editor’s Office.');login.hidden=true;dashboard.hidden=true;await supabase.auth.signOut();return;}login.hidden=true;dashboard.hidden=false;notice.hidden=true;await refresh();}
$('office-login-form').addEventListener('submit',async e=>{e.preventDefault();const email=$('office-email').value.trim();const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});message(error?'Sign-in request failed: '+error.message:'Check your email for a secure sign-in link. Return here after opening it.');});
$('office-logout').addEventListener('click',async()=>{await supabase.auth.signOut();await check();});
$('office-filter').addEventListener('change',render);
supabase.auth.onAuthStateChange(()=>{setTimeout(check,0);});check();

async function loadCirculation() {
  
const section = Array.from(document.querySelectorAll('section, div')).find(el => el.textContent?.trim() === 'Circulation reports are being connected. Check back soon.');


  if (!section) return;

  section.textContent = 'Loading circulation reports...';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      section.textContent = 'Sign in to view circulation reports.';
      return;
    }

    const response = await fetch(
      'https://nlckcelwfcoszbvqyeyr.supabase.co/functions/v1/tribune-circulation',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Report unavailable');

    section.replaceChildren();

    const summary = document.createElement('p');
    summary.textContent =
      `Last 30 days — Visitors: ${report.activeUsers} | Page views: ${report.pageViews} | Sessions: ${report.sessions}`;
    section.appendChild(summary);

    const heading = document.createElement('h3');
    heading.textContent = 'Most Read Pages';
    section.appendChild(heading);

    const list = document.createElement('ol');
    for (const page of report.popularPages || []) {
      const item = document.createElement('li');
      item.textContent = `${page.title}: ${page.views} views`;
      list.appendChild(item);
    }
    section.appendChild(list);
    await loadSubscriberCounts();
  } catch (error) {
    section.textContent = `Circulation report unavailable: ${error.message}`;
  }
}

const circulationObserver = new MutationObserver(() => {
  if (!document.querySelector('#office-dashboard')?.hidden) {
    circulationObserver.disconnect();
    loadCirculation();
  }
});
circulationObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ['hidden'],
  subtree: true
});
if (!document.querySelector('#office-dashboard')?.hidden) {
  circulationObserver.disconnect();
  loadCirculation();
}


// Frank's secure editorial desks. Every request uses the current editor session.
const MOD=$('moderation-queue'), COR=$('correspondence-list');
let correspondencePage=0,correspondenceTotal=0;
const perPage=10;
async function editorAction(action,extra={}){
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError||!session)throw new Error('Editor sign-in required.');
  const {data,error}=await supabase.functions.invoke('tribune-community',{body:{action,...extra},headers:{Authorization:`Bearer ${session.access_token}`}});
  if(error){let detail='';try{detail=(await error.context?.json())?.error||''}catch{}throw new Error(detail||error.message||'Editorial service unavailable');}
  if(data?.error)throw new Error(data.error);
  return data;
}
function editorialDate(v){return new Date(v).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'});}
function articleLink(slug){const a=node('a','VIEW ARTICLE ↗');a.href='article.html?id='+encodeURIComponent(slug);a.target='_blank';a.rel='noopener noreferrer';return a;}
function button(label,fn,cls){const b=node('button',label,cls);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){alert(e.message)}finally{b.disabled=false}});return b;}
function commentCard(c,{moderate=false,report=null}={}){
  const card=node('article',undefined,'office-comment-card');
  card.append(node('h3',(c.is_editor_reply?'🔨 ':'')+(c.author_username||'Unknown reader')));
  card.append(node('div',editorialDate(c.created_at)+' · '+c.article_slug+(c.parent_id?' · REPLY':''),'office-comment-meta'));
  card.append(node('p',c.body));
  if(c.moderation_flags?.length)card.append(node('p','AUTOMATIC FLAGS: '+c.moderation_flags.join(', '),'office-note'));
  if(report)card.append(node('p','REPORTED: '+report.reason+(report.details?' — '+report.details:''),'office-note'));
  const actions=node('div',undefined,'office-comment-actions');actions.append(articleLink(c.article_slug));
  if(moderate){
    actions.append(button('APPROVE',async()=>{if(!confirm('Approve this comment for public display?'))return;await editorAction('editor_moderate',{commentId:c.id,decision:'approve'});await reloadDesks();}));
    actions.append(button('REJECT',async()=>{if(!confirm('Reject this comment?'))return;await editorAction('editor_moderate',{commentId:c.id,decision:'reject'});await reloadDesks();},'office-danger'));
  }else{
    if(!c.is_editor_reply){
      actions.append(button('REPLY AS FRANK',async()=>{
        let form=card.querySelector('.office-reply');if(form){form.remove();return;}
        form=node('form',undefined,'office-reply');const label=node('label','FRANK’S OFFICIAL REPLY');const area=node('textarea');area.maxLength=1200;area.required=true;area.placeholder='The Hammer has entered the conversation…';const send=node('button','PUBLISH FRANK’S REPLY');send.type='submit';const cancel=node('button','CANCEL');cancel.type='button';cancel.addEventListener('click',()=>form.remove());
        form.addEventListener('submit',async e=>{e.preventDefault();if(!area.value.trim())return;send.disabled=true;try{await editorAction('editor_reply',{articleSlug:c.article_slug,parentId:c.id,body:area.value.trim()});await reloadDesks();}catch(err){alert(err.message);send.disabled=false;}});
        form.append(label,area,send,cancel);card.append(form);area.focus();
      }));
    }
    actions.append(button('REMOVE COMMENT',async()=>{if(!confirm('Remove this comment from the public Tribune? This action is recorded.'))return;await editorAction('editor_moderate',{commentId:c.id,decision:'remove'});await reloadDesks();},'office-danger'));
  }
  if(report){actions.append(button('DISMISS REPORT',async()=>{if(!confirm('Dismiss this report and leave the comment published?'))return;await editorAction('editor_report_review',{reportId:report.id,decision:'dismissed'});await loadModerationQueue();}));actions.append(button('REMOVE + CLOSE REPORT',async()=>{if(!confirm('Remove this comment and mark the report reviewed?'))return;await editorAction('editor_moderate',{commentId:c.id,decision:'remove'});await editorAction('editor_report_review',{reportId:report.id,decision:'reviewed'});await reloadDesks();},'office-danger'));}
  card.append(actions);return card;
}
async function loadModerationQueue(){if(!MOD)return;MOD.textContent='Checking the moderation docket…';try{
  const data=await editorAction('editor_queue');MOD.replaceChildren();
  const pending=data.pending||[],reports=data.reports||[];
  MOD.append(node('p',`${pending.length} pending comments | ${reports.length} open reports`,'office-meta'));
  if(pending.length){MOD.append(node('h3','COMMENTS AWAITING FRANK’S VERDICT'));pending.forEach(c=>MOD.append(commentCard(c,{moderate:true})));}
  if(reports.length){MOD.append(node('h3','READER REPORTS'));const comments=data.reportedComments||[];for(const r of reports){const c=comments.find(x=>x.id===r.comment_id);if(c)MOD.append(commentCard(c,{report:r}));else{const el=node('div',undefined,'office-comment-card');el.append(node('p',`Report: ${r.reason} · ${r.details||'No details'}`),node('p','Original comment unavailable.','office-meta'),button('DISMISS REPORT',async()=>{await editorAction('editor_report_review',{reportId:r.id,decision:'dismissed'});await loadModerationQueue();}));MOD.append(el);}}}
  if(!pending.length&&!reports.length)MOD.append(node('p','The moderation docket is clear. Frank can put his feet up.'));
}catch(e){MOD.textContent='Moderation unavailable: '+e.message;}}
async function loadCorrespondence(){if(!COR)return;COR.textContent='Retrieving the public correspondence…';try{
 const filter=$('correspondence-filter').value,articleSlug=$('correspondence-article').value.trim();
 const data=await editorAction('editor_comments',{page:correspondencePage,pageSize:perPage,filter,articleSlug});
 correspondenceTotal=data.total||0;COR.replaceChildren();
 $('correspondence-summary').textContent=`${correspondenceTotal} matching published comments · newest first`;
 if(!data.comments?.length)COR.append(node('p','No comments match this filter.','office-empty'));
 else data.comments.forEach(c=>{const card=commentCard(c);if(c.answered)card.append(node('p','✓ Frank has replied','office-comment-meta'));else if(!c.is_editor_reply)card.append(node('p','Awaiting Frank’s reply','office-comment-meta'));COR.append(card)});
 const maxPage=Math.max(1,Math.ceil(correspondenceTotal/perPage));$('correspondence-page').textContent=`Page ${correspondencePage+1} of ${maxPage}`;
 $('correspondence-prev').disabled=correspondencePage===0;$('correspondence-next').disabled=correspondencePage+1>=maxPage;
 }catch(e){COR.textContent='Correspondence unavailable: '+e.message;}}
async function reloadDesks(){await Promise.all([loadModerationQueue(),loadCorrespondence()]);}
$('correspondence-prev').addEventListener('click',()=>{if(correspondencePage>0){correspondencePage--;loadCorrespondence();}});
$('correspondence-next').addEventListener('click',()=>{if((correspondencePage+1)*perPage<correspondenceTotal){correspondencePage++;loadCorrespondence();}});
$('correspondence-filter').addEventListener('change',()=>{correspondencePage=0;loadCorrespondence();});
$('correspondence-refresh').addEventListener('click',()=>{correspondencePage=0;loadCorrespondence();});
$('correspondence-article').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();correspondencePage=0;loadCorrespondence();}});
const deskObserver=new MutationObserver(()=>{if(!dashboard.hidden){deskObserver.disconnect();reloadDesks();}});
deskObserver.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden){deskObserver.disconnect();reloadDesks();}
// Subscriber counts use editor-only RLS, never expose email addresses in the Office summary.
async function loadSubscriberCounts(){const el=$('circulation-stats');if(!el)return;try{const data=await editorAction('editor_subscribers');const p=node('p',`SUBSCRIBERS — Total: ${data.total} | Confirmed: ${data.confirmed} | Pending: ${data.pending} | Unsubscribed: ${data.unsubscribed}`,'office-meta');p.id='office-subscriber-summary';el.append(p);}catch(e){el.append(node('p','Subscriber totals unavailable: '+e.message,'office-meta'));}}
