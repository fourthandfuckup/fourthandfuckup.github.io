'use strict';
// Preview-only edition layout planning. Never writes to Supabase or alters an edition.
(()=>{
const $=id=>document.getElementById(id);
const key='tribune-preview-department-headlines';
const idsKey='tribune-preview-department-draft-ids';
const supportKey='tribune-preview-department-supporting';
const support=$('department-support-draft'),supportList=$('department-support-list');
const dept=$('department-plan'),draft=$('department-lead-draft'),status=$('department-plan-status');
function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
function sync(){const source=$('main');if(!source)return;const prev=draft.value;draft.replaceChildren(new Option('— No featured article —',''));for(const o of source.options){if(!o.value)continue;draft.add(new Option(o.textContent,o.value));}support.replaceChildren(new Option('— Select saved draft —',''));for(const o of source.options){if(o.value)support.add(new Option(o.textContent,o.value));}const selected=read(idsKey)[dept.value]||prev;draft.value=[...draft.options].some(o=>o.value===selected)?selected:'';}
function choose(){sync();renderSupport();draft.value=read(idsKey)[dept.value]||'';status.textContent='Select a saved draft and set the test feature.';}
function renderSupport(){
supportList.replaceChildren();
const list=read(supportKey)[dept.value]||[];
for(let i=0;i<list.length;i++){
const item=list[i],row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #8a7655;padding:8px 0';
const title=document.createElement('strong');title.textContent=(i+1)+'. '+item.headline;row.append(title);
for(const [label,move] of [['UP',-1],['DOWN',1],['REMOVE',null]]){
const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=move!==null&&(i+move<0||i+move>=list.length);
b.onclick=()=>{const data=read(supportKey),arr=[...(data[dept.value]||[])];if(move===null)arr.splice(i,1);else [arr[i],arr[i+move]]=[arr[i+move],arr[i]];data[dept.value]=arr;localStorage.setItem(supportKey,JSON.stringify(data));persistCurrentLayout();renderSupport();};row.append(b);
}supportList.append(row);
}
if(!list.length)supportList.textContent='No supporting stories selected.';
}
$('department-add-support').addEventListener('click',()=>{
const id=support.value,headline=support.selectedOptions[0]?.textContent;
if(!id)return status.textContent='Choose a saved article first.';
if(id===draft.value)return status.textContent='The lead article is already featured; choose a different supporting story.';
const data=read(supportKey),list=data[dept.value]||[];
if(list.some(x=>x.id===id))return status.textContent='This story is already in the list.';
list.push({id,headline});data[dept.value]=list;localStorage.setItem(supportKey,JSON.stringify(data));persistCurrentLayout();renderSupport();status.textContent='Supporting story added to the browser-only preview.';
});

const departmentNames={summit:'Westfort Dynasty',chafe:'Sleeping Giant',bench:'Benchwarmer Bulletin',frank:"Frank's Desk",shame:'Wall of Shame'};
function overview(){
const box=$('department-overview');box.replaceChildren();
const heads=read(key),supporting=read(supportKey);
for(const [id,name] of Object.entries(departmentNames)){
const block=document.createElement('div');block.style.cssText='padding:8px 0;border-bottom:1px solid #8a7655';
const h=document.createElement('strong');h.textContent=name;block.append(h);
const lead=document.createElement('p');lead.textContent='Featured: '+(heads[id]||'Not selected');block.append(lead);
const list=supporting[id]||[];const note=document.createElement('p');note.textContent='Supporting: '+(list.length?list.map((a,i)=>(i+1)+'. '+a.headline).join(' | '):'None');block.append(note);box.append(block);
}
}
$('department-preview-all').addEventListener('click',overview);
$('department-clear-plan').addEventListener('click',()=>{
if(!confirm('Clear the featured and supporting story placements for '+departmentNames[dept.value]+' in this browser? This does not affect any published content.'))return;
for(const k of [key,idsKey,supportKey]){const data=read(k);delete data[dept.value];localStorage.setItem(k,JSON.stringify(data));}
persistCurrentLayout();choose();overview();status.textContent='Browser-only department layout cleared. Published content unchanged.';
});
$('department-private-proof').addEventListener('click',()=>{const id=read(idsKey)[dept.value],supporting=read(supportKey)[dept.value]||[];const ids=[id,...supporting.map(a=>a.id)].filter(Boolean);if(!ids.length){status.textContent='Select a featured or supporting article first.';return;}document.dispatchEvent(new CustomEvent('tribune:private-department-proof',{detail:{department:dept.value,ids}}));});
// Per-edition snapshots are private to this browser, never stored in Supabase.
const editionPrefix='tribune-preview-edition-layout:';
const layoutKeys=[key,idsKey,supportKey];
let activeEdition=null;
function snapshot(){const obj={};for(const k of layoutKeys)obj[k]=read(k);return obj;}
function persistCurrentLayout(){if(activeEdition)localStorage.setItem(editionPrefix+activeEdition,JSON.stringify(snapshot()));}
document.addEventListener('tribune:department-layout-changed',()=>{persistCurrentLayout();choose();overview();});
window.addEventListener('storage',event=>{if(layoutKeys.includes(event.key)){persistCurrentLayout();choose();overview();status.textContent='Department placements refreshed from another Tribune editor tab.';}});
function applySnapshot(obj){for(const k of layoutKeys)localStorage.setItem(k,JSON.stringify(obj?.[k]||{}));choose();overview();}
document.addEventListener('tribune:edition-layout-save',event=>{
 const id=event.detail?.id;if(!id)return;
 localStorage.setItem(editionPrefix+id,JSON.stringify(snapshot()));activeEdition=id;
 status.textContent='Department layout snapshot saved for this edition in this browser only. Not yet part of cloud edition or publication.';
});
document.addEventListener('tribune:edition-layout-switch',event=>{
 const id=event.detail?.id;
 if(activeEdition)localStorage.setItem(editionPrefix+activeEdition,JSON.stringify(snapshot()));
 activeEdition=id||null;
 if(!id){applySnapshot({});status.textContent='New edition: blank department layout plan.';return;}
 let saved=null;try{saved=JSON.parse(localStorage.getItem(editionPrefix+id)||'null')}catch{}
 applySnapshot(saved);
 status.textContent=saved?'Restored this edition’s browser-only department layout.':'No department layout saved for this edition in this browser.';
});

const backupStatus=$('department-backup-status');
$('department-export-layout').addEventListener('click',()=>{
const payload={format:'tribune-department-layout',version:1,editionId:activeEdition,exportedAt:new Date().toISOString(),layout:snapshot()};
const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tribune-department-layout-'+(activeEdition||'unsaved')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
backupStatus.textContent='Layout backup downloaded. This contains article titles and draft IDs, not full private article text.';
});
$('department-restore-layout').addEventListener('click',async()=>{
const file=$('department-import-layout').files[0];if(!file){backupStatus.textContent='Choose a layout JSON backup first.';return;}
if(file.size>100000){backupStatus.textContent='Backup exceeds 100 KB. Restore cancelled.';return;}
try{
const payload=JSON.parse(await file.text());
if(payload?.format!=='tribune-department-layout'||payload.version!==1||!payload.layout||typeof payload.layout!=='object')throw Error('This is not a supported Tribune layout backup.');
const obj=payload.layout;
for(const k of layoutKeys){if(!obj[k]||typeof obj[k]!=='object'||Array.isArray(obj[k]))throw Error('Layout backup is missing required department data.');}
for(const [dep,entries] of Object.entries(obj[supportKey])){if(!departmentNames[dep]||!Array.isArray(entries)||entries.length>100||entries.some(x=>typeof x.id!=='string'||typeof x.headline!=='string'))throw Error('Invalid supporting article entries.');}
for(const [dep,title] of Object.entries(obj[key]))if(!departmentNames[dep]||typeof title!=='string')throw Error('Invalid featured headline.');
for(const [dep,id] of Object.entries(obj[idsKey]))if(!departmentNames[dep]||typeof id!=='string')throw Error('Invalid featured draft ID.');
if(!confirm('Restore this layout to the CURRENT browser edition plan? Existing browser-only placements for this edition will be replaced. No cloud or public data changes.'))return;
applySnapshot(obj);if(activeEdition)localStorage.setItem(editionPrefix+activeEdition,JSON.stringify(snapshot()));
backupStatus.textContent='Layout restored in this browser. Confirm article IDs still exist in Saved Drafts before publishing.';
}catch(e){backupStatus.textContent='Restore failed: '+e.message;}
});
dept.addEventListener('change',choose);
$('department-save-plan').addEventListener('click',()=>{
const id=draft.value,selected=draft.selectedOptions[0],name=selected?.textContent||'';
const headlines=read(key),ids=read(idsKey);
if(id){headlines[dept.value]=name;ids[dept.value]=id;}else{delete headlines[dept.value];delete ids[dept.value];}
localStorage.setItem(key,JSON.stringify(headlines));localStorage.setItem(idsKey,JSON.stringify(ids));persistCurrentLayout();
status.textContent=id?'Test placement saved for this browser. Draft remains private and unpublished.':'Test featured placement cleared.';
});
$('department-open-preview').addEventListener('click',()=>window.open('index.html?section='+encodeURIComponent(dept.value),'_blank','noopener'));
const source=$('main');if(source){new MutationObserver(()=>sync()).observe(source,{childList:true});sync();renderSupport();overview();}
})();
