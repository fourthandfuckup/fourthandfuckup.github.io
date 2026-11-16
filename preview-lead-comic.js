'use strict';
(()=>{
const $=id=>document.getElementById(id);
const select=$('edition-lead-comic'),status=$('edition-lead-comic-status'),root=$('edition-comic-order');
if(!select||!root)return;
const leadKey='tribune-preview-featured-comic',orderKey='tribune-preview-comic-order';
let current=[],ordered=[],published=[];
function readOrder(){try{const ids=JSON.parse(localStorage.getItem(orderKey)||'[]');return Array.isArray(ids)?ids:[]}catch{return []}}
function render(){
root.replaceChildren();
if(!ordered.length){root.textContent='No comics available yet.';return;}
ordered.forEach((comic,i)=>{
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #8a7655;padding:8px 0';
const label=document.createElement('strong');label.textContent=(i===0?'LEAD · ':'')+(i+1)+'. '+(comic.title||comic.series||'Untitled');row.append(label);
for(const [text,delta] of [['UP',-1],['DOWN',1]]){const button=document.createElement('button');button.type='button';button.textContent=text;button.disabled=i+delta<0||i+delta>=ordered.length;button.onclick=()=>{[ordered[i],ordered[i+delta]]=[ordered[i+delta],ordered[i]];render();};row.append(button);}
root.append(row);
});
}
$('edition-save-lead-comic').addEventListener('click',()=>{localStorage.setItem(leadKey,select.value);if(select.value){ordered.sort((a,b)=>Number(b.id===select.value)-Number(a.id===select.value));localStorage.setItem(orderKey,JSON.stringify(ordered.map(c=>c.id)));}status.textContent='Lead comic saved in this browser. No publication occurred.';render();});
$('edition-save-comic-order').addEventListener('click',()=>{localStorage.setItem(orderKey,JSON.stringify(ordered.map(c=>c.id)));localStorage.setItem(leadKey,ordered[0]?.id||'');select.value=ordered[0]?.id||'';status.textContent='Full comic order saved in this browser. Reload The Obituaries to see it. No live changes.';});
$('edition-reset-comic-order').addEventListener('click',()=>{localStorage.removeItem(orderKey);localStorage.removeItem(leadKey);ordered=[...current];select.value='';render();status.textContent='Preview comic ordering reset. Published data unchanged.';});
function refreshDraftComics(){
 const allDraft=[...document.querySelectorAll('.comic-check')];
 const checked=allDraft.filter(cb=>cb.checked);
 const selected=checked.map(cb=>({id:cb.value,title:cb.closest('label')?.querySelector('span')?.textContent?.trim()||'Untitled comic'}));
 // Include both published comics and selected draft comics; deduplicate by ID.
 const ids=readOrder(),lead=localStorage.getItem(leadKey)||'';
 current=[...published];for(const cb of allDraft){const comic={id:cb.value,title:cb.closest('label')?.querySelector('span')?.textContent?.trim()||'Untitled comic'};if(!current.some(c=>c.id===comic.id))current.push(comic);}
 ordered=[...current].sort((a,b)=>{
  const ia=ids.indexOf(a.id),ib=ids.indexOf(b.id);
  return (ia<0?9999:ia)-(ib<0?9999:ib);
 });
 if(!ids.length&&lead)ordered.sort((a,b)=>Number(b.id===lead)-Number(a.id===lead));
 const previous=select.value;
 select.replaceChildren(new Option('Choose lead comic',''));
 for(const comic of current)select.add(new Option(comic.title||comic.series||'Untitled comic',comic.id));
 select.value=current.some(c=>c.id===previous)?previous:(current.some(c=>c.id===lead)?lead:(ordered[0]?.id||''));
 render();
 status.textContent=current.length?current.length+' available comic(s), including '+selected.length+' selected for this draft. Only checked comics are included in the saved edition.':'Select comics below to choose a lead comic for this edition.';
}
const library=$('comic-library');
if(library){
 library.addEventListener('change',event=>{if(event.target.matches('.comic-check'))refreshDraftComics();});
 new MutationObserver(()=>refreshDraftComics()).observe(library,{childList:true});
 document.addEventListener('tribune:comic-selection-updated',refreshDraftComics);
}
refreshDraftComics();
(async()=>{
 try{
 const response=await fetch('https://nlckcelwfcoszbvqyeyr.supabase.co/rest/v1/tribune_live_published_editions?select=content,published_at&order=published_at.desc&limit=1',{headers:{apikey:'sb_publishable_CrRNQGAZoc6TtT3wFe3sUg_hoYuupy8'}});
 if(!response.ok)throw Error('Published comic library unavailable');
 const editions=await response.json();published=editions[0]?.content?.comics||[];
 refreshDraftComics();
 }catch(e){status.textContent='Published comic list unavailable; selected draft comics remain available.';}
})();
})();
