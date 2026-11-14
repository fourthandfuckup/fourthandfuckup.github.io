import { supabase as db } from './office.js';
const $=id=>document.getElementById(id), section=$('hammer-war-room');
const departments={investigations:'Investigations',social:'Social Media',newsletter:'Newsletter',maintenance:'Website Maintenance',other:'Other'};
const template=['Story drafted and fact-checked','Evidence and names verified','Headline and artwork approved','Article-specific social preview prepared','Article tested on desktop and mobile','Publish article and verify live URL','Share on social media'];
let assignments=[],items=[],view='month',cursor=new Date(),ready=false,activeId=null;
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const date=s=>new Date(s+'T12:00:00');
const addDays=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
const weekStart=d=>addDays(d,-(d.getDay()+6)%7);
const fmt=(d,opts)=>d.toLocaleDateString('en-CA',opts);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
function taskButton(a){const b=el('button',undefined,'war-task '+(a.status==='complete'?'is-complete ':'')+a.priority);b.type='button';b.append(el('span',a.title),el('small',a.status==='complete'?'✓ DONE':departments[a.department]||'Other'));b.onclick=()=>openEditor(a.id);return b}
function filtered(){return assignments.filter(a=>$('war-filter').value==='all'||a.department===$('war-filter').value)}
function stats(){const today=iso(new Date()),week=iso(addDays(new Date(),7)),all=assignments,unfinished=a=>a.status!=='complete';const values=[[all.filter(a=>unfinished(a)&&a.due_date>=today&&a.due_date<week).length,'DUE THIS WEEK'],[all.filter(a=>a.status==='in_progress').length,'IN PROGRESS'],[all.filter(a=>unfinished(a)&&a.due_date<today).length,'OVERDUE']];$('war-stats').replaceChildren(...values.map(([n,label])=>{const e=el('div',undefined,'war-stat');e.append(el('strong',String(n)),el('span',label));return e}))}
function showDay(key,tasks){const target=$('war-day-detail');if(!target)return;target.replaceChildren();target.append(el('h3',fmt(date(key),{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase()));if(!tasks.length)target.append(el('p','No assignments due.','war-muted'));else tasks.forEach(a=>target.append(taskButton(a)));document.querySelectorAll('.war-date-cell').forEach(c=>c.classList.toggle('is-selected',c.getAttribute('aria-label')===fmt(date(key),{weekday:'long',month:'long',day:'numeric'})+': '+tasks.length+' assignments'));}
function render(){stats();const root=$('war-calendar');root.replaceChildren();const data=filtered();const today=iso(new Date());document.querySelectorAll('[data-war-view]').forEach(b=>b.classList.toggle('active',b.dataset.warView===view));
if(view==='week'||view==='month'){
 const monthly=view==='month';
 const first=monthly?new Date(cursor.getFullYear(),cursor.getMonth(),1):weekStart(cursor);
 const start=weekStart(first);
 const count=monthly?42:7;
 $('war-period').textContent=monthly?fmt(first,{month:'long',year:'numeric'}):fmt(start,{month:'short',day:'numeric'})+' – '+fmt(addDays(start,6),{month:'short',day:'numeric',year:'numeric'});
 const wrap=el('div',undefined,'war-month war-calendar-grid');
 ['MON','TUE','WED','THU','FRI','SAT','SUN'].forEach(label=>wrap.append(el('div',label,'war-month-head')));
 for(let i=0;i<count;i++){
  const d=addDays(start,i),key=iso(d),tasks=data.filter(a=>a.due_date===key);
  const cell=el('button',undefined,'war-month-day war-date-cell'+(d.getMonth()!==first.getMonth()&&monthly?' is-outside':'')+(key===today?' is-today':''));
  cell.type='button';cell.setAttribute('aria-label',fmt(d,{weekday:'long',month:'long',day:'numeric'})+': '+tasks.length+' assignments');
  cell.append(el('strong',String(d.getDate())));
  const dots=el('span',undefined,'war-date-dots');
  [...new Set(tasks.map(a=>a.department))].forEach(dep=>{const dot=el('i',undefined,'war-dot war-dot-'+dep);dot.title=departments[dep]||'Other';dots.append(dot)});
  cell.append(dots);
  if(!monthly&&tasks.length)cell.append(el('small',tasks.length+' assignment'+(tasks.length===1?'':'s')));
  cell.onclick=()=>showDay(key,tasks);
  wrap.append(cell);
 }
 root.append(wrap);
 const legend=el('div',undefined,'war-legend');Object.entries(departments).forEach(([key,name])=>{const item=el('span');item.append(el('i',undefined,'war-dot war-dot-'+key),document.createTextNode(name));legend.append(item)});root.append(legend);
 const detail=el('div',undefined,'war-day-detail');detail.id='war-day-detail';root.append(detail);
 const selected=iso(cursor);const shown=selected>=iso(start)&&selected<=iso(addDays(start,count-1))?selected:today;
 const visible=shown>=iso(start)&&shown<=iso(addDays(start,count-1))?shown:iso(start);
 showDay(visible,data.filter(a=>a.due_date===visible));
}
else{$('war-period').textContent='ALL ASSIGNMENTS';const wrap=el('div',undefined,'war-list');if(!data.length)wrap.append(el('p','No assignments yet. Add one to get Frank moving.','war-empty'));data.sort((a,b)=>a.due_date.localeCompare(b.due_date)).forEach(a=>{const row=el('div',undefined,'war-list-entry');row.append(el('time',fmt(date(a.due_date),{month:'short',day:'numeric',year:'numeric'})));row.append(taskButton(a));wrap.append(row)});root.append(wrap)}}
function checkRow(data={title:'',due_date:'',completed:false}){const row=el('div',undefined,'war-check-row');if(data.id)row.dataset.itemId=data.id;const check=el('input');check.type='checkbox';check.checked=!!data.completed;check.setAttribute('aria-label','Completed');const title=el('input');title.type='text';title.maxLength=200;title.required=true;title.value=data.title;title.placeholder='Checklist item';title.setAttribute('aria-label','Checklist item');const due=el('input');due.type='date';due.value=data.due_date||'';due.title='Optional checklist due date';const remove=el('button','×');remove.type='button';remove.title='Remove item';remove.onclick=()=>row.remove();row.append(check,title,due,remove);$('war-checklist').append(row)}
function openEditor(id=null){activeId=id;const a=assignments.find(x=>x.id===id);$('war-editor').hidden=false;$('war-editor-title').textContent=a?'EDIT ASSIGNMENT':'NEW ASSIGNMENT';$('war-title').value=a?.title||'';$('war-due').value=a?.due_date||iso(new Date());$('war-department').value=a?.department||'investigations';$('war-priority').value=a?.priority||'normal';$('war-status').value=a?.status||'planned';$('war-notes').value=a?.notes||'';$('war-delete').hidden=!a;$('war-feedback').textContent='';$('war-checklist').replaceChildren();(a?items.filter(x=>x.assignment_id===id).sort((x,y)=>x.position-y.position):template.map(title=>({title}))).forEach(checkRow);$('war-editor').scrollIntoView({behavior:'smooth',block:'nearest'})}
async function reload(){const [a,b]=await Promise.all([db.from('tribune_war_assignments').select('*').order('due_date'),db.from('tribune_war_checklist').select('*').order('position')]);if(a.error||b.error)throw new Error(a.error?.message||b.error?.message);assignments=a.data||[];items=b.data||[];render()}
async function save(e){e.preventDefault();const btn=$('war-save');btn.disabled=true;$('war-feedback').textContent='Saving…';try{const payload={title:$('war-title').value.trim(),due_date:$('war-due').value,department:$('war-department').value,priority:$('war-priority').value,status:$('war-status').value,notes:$('war-notes').value.trim()};if(!payload.title||!payload.due_date)throw new Error('Title and due date are required.');let id=activeId;if(id){const {error}=await db.from('tribune_war_assignments').update(payload).eq('id',id);if(error)throw error}else{const {data,error}=await db.from('tribune_war_assignments').insert(payload).select('id').single();if(error)throw error;id=data.id}
const rows=[...$('war-checklist').children].map((r,i)=>({...r.dataset.itemId?{id:r.dataset.itemId}:{},assignment_id:id,position:i,title:r.querySelector('input[type=text]').value.trim(),due_date:r.querySelector('input[type=date]').value||null,completed:r.querySelector('input[type=checkbox]').checked})).filter(r=>r.title);
if(rows.length){const {error}=await db.from('tribune_war_checklist').upsert(rows);if(error)throw error}
const kept=new Set(rows.filter(r=>r.id).map(r=>r.id));const removed=items.filter(x=>x.assignment_id===id&&!kept.has(x.id)).map(x=>x.id);if(removed.length){const {error}=await db.from('tribune_war_checklist').delete().in('id',removed);if(error)throw error}await reload();$('war-editor').hidden=true;activeId=null}catch(err){$('war-feedback').textContent='NOT SAVED: '+err.message}finally{btn.disabled=false}}
async function del(){if(!activeId||!confirm('Permanently delete this assignment and its checklist?'))return;const {error}=await db.from('tribune_war_assignments').delete().eq('id',activeId);if(error){$('war-feedback').textContent=error.message;return}activeId=null;$('war-editor').hidden=true;await reload()}
async function initialize(){if(ready)return;const {data:{session}}=await db.auth.getSession();if(!session)return;const {data:member,error}=await db.from('tribune_editors').select('user_id').eq('user_id',session.user.id).maybeSingle();if(error||!member)return;ready=true;try{await reload()}catch(e){$('war-calendar').textContent='War Room setup required: '+e.message;ready=false}}
section.addEventListener('toggle',()=>{if(section.open)initialize()});db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){ready=false;assignments=[];items=[];$('war-calendar').replaceChildren()}else if(section.open)setTimeout(initialize,0)});
$('war-new').onclick=()=>openEditor();$('war-close').onclick=()=>{$('war-editor').hidden=true};$('war-add-check').onclick=()=>checkRow();$('war-delete').onclick=del;$('war-form').addEventListener('submit',save);$('war-filter').onchange=render;document.querySelectorAll('[data-war-view]').forEach(b=>b.onclick=()=>{view=b.dataset.warView;render()});$('war-prev').onclick=()=>{cursor=view==='month'?new Date(cursor.getFullYear(),cursor.getMonth()-1,1):addDays(cursor,-7);render()};$('war-next').onclick=()=>{cursor=view==='month'?new Date(cursor.getFullYear(),cursor.getMonth()+1,1):addDays(cursor,7);render()};$('war-today').onclick=()=>{cursor=new Date();render()};
