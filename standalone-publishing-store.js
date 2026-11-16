'use strict';
// Standalone publishing data adapter. Deliberately has no automatic writes.
// Use only after the isolated table is installed and editor access verified.
window.TribuneStandaloneStore={
 table:'tribune_standalone_articles',
 async stage(db,draft,editorId,draftId){
  if(!db||!window.TribuneStandalone)throw new Error('Publishing adapter unavailable.');
  const record=window.TribuneStandalone.build(draft,draftId,editorId);
  // Idempotency: a saved draft may have at most one staged article.
  const {data:existing,error:lookupError}=await db.from(this.table)
   .select('id,slug,is_public').eq('draft_id',draftId).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing?.is_public)throw new Error('This draft is already published. Editing a published story requires a separate workflow.');
  if(existing){
   const {data,error}=await db.from(this.table).update({...record,slug:existing.slug})
    .eq('id',existing.id).eq('is_public',false).select('id,slug,is_public').single();
   if(error)throw error;
   return data;
  }
  const {data,error}=await db.from(this.table).insert(record).select('id,slug,is_public').single();
  if(error)throw error;
  return data;
 },
 async listPrivate(db){
  const {data,error}=await db.from(this.table).select('id,slug,headline,author,updated_at,is_public')
   .eq('is_public',false).order('updated_at',{ascending:false}).limit(50);
  if(error)throw error;
  return data||[];
 }
};
