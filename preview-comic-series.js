'use strict';
(()=>{
const select=document.getElementById('comic-series'),upload=document.getElementById('upload-comic'),status=document.getElementById('comic-status');
if(!select)return;
const key='tribune-preview-comic-series';
function read(){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
function populate(){const current=select.value;for(const s of read()){if(![...select.options].some(o=>o.value===s.id)){const option=new Option(s.title+' (preview only)',s.id);select.add(option,select.options[select.options.length-1]);}}if(current&&[...select.options].some(o=>o.value===current))select.value=current;}
function guard(){const preview=read().some(s=>s.id===select.value);upload.disabled=preview;if(preview)status.textContent='This is a preview-only new series. Upload is disabled to avoid writing it into the production database. You can see the series in the preview archives.';}
select.addEventListener('change',()=>{
if(select.value==='__new__'){
const title=prompt('New comic series name (preview only):');
if(!title?.trim()){select.value='';return;}
const name=title.trim().slice(0,100),id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
if(!id){status.textContent='Use letters or numbers in the series name.';select.value='';return;}
const list=read();
if(!list.some(s=>s.id===id)&&![...select.options].some(o=>o.value===id)){list.push({id,title:name});localStorage.setItem(key,JSON.stringify(list));}
populate();select.value=id;status.textContent='New series added to preview comic archives. No live database changes.';
}
guard();
});
populate();guard();
})();
