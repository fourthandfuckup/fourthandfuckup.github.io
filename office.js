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
