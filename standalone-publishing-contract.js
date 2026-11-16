'use strict';
/* Standalone article publishing contract. No side effects: validation and
 * preview-only payload construction. Publishing is enabled separately after
 * isolated database/RLS and metadata-page deployment tests. */
window.TribuneStandalone={
 slugify(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90).replace(/-$/,'');},
 validate(d){
  const errors=[];
  if(!String(d?.headline||'').trim())errors.push('Headline is required.');
  if(!String(d?.author||'').trim())errors.push('Byline is required.');
  if(!String(d?.summary||'').trim())errors.push('Teaser is required.');
  if(String(d?.story||'').trim().length<50)errors.push('Story must be at least 50 characters.');
  if(!Array.isArray(d?.categories)||!d.categories.length)errors.push('Select at least one category.');
  const slug=this.slugify(d?.headline);
  if(!slug)errors.push('Headline must contain letters or numbers for a URL.');
  return {ok:errors.length===0,errors,slug};
 },
 build(d,draftId,editorId){
  const check=this.validate(d);
  if(!check.ok)throw new Error(check.errors.join(' '));
  if(!/^[0-9a-f-]{36}$/i.test(String(draftId)))throw new Error('Save the draft before preparing publication.');
  if(!/^[0-9a-f-]{36}$/i.test(String(editorId)))throw new Error('An authenticated editor is required.');
  return {draft_id:draftId,slug:check.slug,headline:d.headline.trim(),author:d.author.trim(),
   summary:d.summary.trim(),story:d.story.trim(),categories:d.categories,
   published_by:editorId,is_public:false};
 }
};
