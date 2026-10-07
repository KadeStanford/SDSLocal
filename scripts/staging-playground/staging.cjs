const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const env=p=>Object.fromEntries(fs.readFileSync(path.join(root,p),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_0-9]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const config=env('.env'),mobile=env('apps/mobile/.env.local');
const ref=config.SDS_STAGING_SUPABASE_PROJECT_REF;
if(ref!=='lgddhdexvwclfrnzjtly'||config.SDS_STAGING_BILLING_LOCK!=='true'||mobile.EXPO_PUBLIC_SUPABASE_URL!==`https://${ref}.supabase.co`)throw Error('Staging guard failed');
const base=`https://${ref}.supabase.co`,key=mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||mobile.EXPO_PUBLIC_SUPABASE_ANON_KEY;
async function req(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(120000)});const body=await r.text();if(!r.ok)throw Error(`HTTP ${r.status}: ${body.slice(0,600)}`);try{return JSON.parse(body)}catch{return body}}
async function query(sql){return req(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${config.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})})}
async function login(email,password=config.SDS_STAGING_DEMO_PASSWORD){return req(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})})}
const auth=s=>({apikey:key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'});
module.exports={query,login,req,auth,base,ref,config,key,root};
if(require.main===module){query(fs.readFileSync(process.argv[2],'utf8')).then(r=>{if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(r,null,2));else console.log(JSON.stringify(r,null,2))}).catch(e=>{console.error(e.message);process.exitCode=1})}
