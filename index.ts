import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
const origin='https://fourthandfuckup.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, authorization, apikey','Vary':'Origin'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const text=(v:FormDataEntryValue|null)=>typeof v==='string'?v.trim():'';
const maxBytes=54*1024*1024;
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(req.headers.get('origin')!==origin)return reply({error:'Invalid website origin'},403);
 const len=Number(req.headers.get('content-length')||0);if(len>maxBytes)return reply({error:'Submission too large'},413);
 try{
  const data=await req.formData();
  if(text(data.get('fax_number')))return reply({error:'Submission rejected'},400);
  const reportType=text(data.get('reportType'));
  if(!['Report a Fuckup','Report Absolute Fucking Dominance'].includes(reportType))return reply({error:'Invalid report type'},400);
  const league=text(data.get('league')),team=text(data.get('team')),story=text(data.get('story')),email=text(data.get('contact'));
  if(!league||league.length>120||!team||team.length>120||story.length<15||story.length>6000||email.length>254||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return reply({error:'Please check the report fields'},400);
  const files=data.getAll('evidence');
  if(files.length>5)return reply({error:'Maximum five screenshots'},400);
  const images:File[]=[];
  for(const item of files){if(!(item instanceof File))continue;if(!item.size)continue;if(item.size>10*1024*1024||!['image/png','image/jpeg','image/webp'].includes(item.type))return reply({error:'Invalid screenshot type or size'},400);images.push(item)}
  // Browser-origin restrictions and honeypots are not substitutes for CAPTCHA/rate limits.
  // Keep this endpoint unpublished until a server-verified anti-bot check is configured.
  const token=text(data.get('cf-turnstile-response'));
  if(!token||token.length>2048)return reply({error:'Please complete the security verification.'},403);
  const turnstileSecret=Deno.env.get('TURNSTILE_SECRET_KEY');
  if(!turnstileSecret)throw Error('Missing Turnstile secret');
  const checkBody=new URLSearchParams({secret:turnstileSecret,response:token});
  const visitorIp=req.headers.get('cf-connecting-ip');
  if(visitorIp)checkBody.set('remoteip',visitorIp);
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:checkBody});
  if(!check.ok)throw Error('Turnstile service unavailable');
  const verdict=await check.json();
  if(!verdict.success||verdict.hostname!=='fourthandfuckup.github.io')return reply({error:'Security verification failed. Please try again.'},403);
  if(Deno.env.get('TRIBUNE_INTAKE_ENABLED')!=='true')return reply({error:'The Tip Line is not open yet.'},503);
  const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!secret)throw Error('Missing server-side Supabase key');
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:record,error:insertError}=await admin.from('tribune_cases').insert({report_type:reportType==='Report a Fuckup'?'fuckup':'dominance',league_name:league,team_name:team,story,contact_email:email||null,status:'new'}).select('id').single();
  if(insertError||!record)throw Error('Could not create case');
  for(const file of images){const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type]!;const path=`${record.id}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadError}=await admin.storage.from('tribune-evidence').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw Error('Evidence upload failed');
   const {error:metaError}=await admin.from('tribune_evidence').insert({case_id:record.id,storage_path:path,file_name:file.name.slice(0,200)});
   if(metaError)throw Error('Evidence metadata failed');
  }
  return reply({case_id:record.id});
 }catch(e){console.error('Tip Line submission error',e);return reply({error:'Could not deliver your report. Please try again later.'},500)}
});
