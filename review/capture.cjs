const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/Stanj/Documents/Codex/2026-10-05/task-2/SDSLocal-e2e/node_modules/@playwright/test');
const root=path.resolve(__dirname,'..'),runner=__dirname+'/runner',ledgerPath=runner+'/public/coverage.json';
const ledger=JSON.parse(fs.readFileSync(ledgerPath)),batch=process.argv.includes('--batch'),retry=process.argv.includes('--retry'),offline=process.argv.includes('--offline');
const images=runner+'/public/captures';fs.mkdirSync(images,{recursive:true});
const {sourceFiles,sha}=require('C:/Users/Stanj/Documents/Codex/2026-10-05/task-5/current-source-identity.cjs');
const identity=()=>sha(Buffer.from(['apps/mobile/src','apps/mobile/assets','packages'].flatMap(dir=>sourceFiles(root+'/'+dir).map(f=>({...f,path:dir+'/'+f.path}))).map(f=>f.path+'\0'+f.sha256+'\n').join('')));
const sourceIdentity=identity();ledger.sourceIdentity=sourceIdentity;
let specs=ledger.specs;
if(process.argv.includes('--one'))specs=specs.filter(s=>s.key==='current-home:integrated');
if(batch){const keys=['explore','b/[slug]','account','rewards','order'];specs=keys.map(k=>specs.find(s=>new URL(s.url).searchParams.get('screen')===k&&s.viewport.width===390&&!new URL(s.url).searchParams.has('textScale'))).filter(Boolean);const alerts=ledger.specs.find(s=>s.key.includes('alerts')&&s.viewport.width===390);if(alerts)specs.push(alerts);}
function save(){ledger.at=new Date().toISOString();fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));fs.writeFileSync(__dirname+'/evidence/coverage.json',JSON.stringify(ledger,null,2));}
async function readiness(page){
 await page.waitForFunction(()=>document.body.innerText.trim().length>20&&!document.body.innerText.includes('Loading actual screen…'),null,{timeout:30000});
 if(new URL(page.url()).searchParams.has('reviewView'))await page.waitForFunction(()=>['ready','manual'].includes(document.documentElement.dataset.reviewSetup),null,{timeout:25000});
 await page.evaluate(()=>document.fonts.ready);
 return await page.evaluate(async()=>{
  const urls=new Set();for(const e of document.querySelectorAll('*')){const b=getComputedStyle(e).backgroundImage;for(const match of b.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(match[1]);}
  const reports=await Promise.all([...document.images].map(async img=>{try{await img.decode();return {url:img.currentSrc||img.src,loaded:img.naturalWidth>0,width:img.naturalWidth}}catch{return {url:img.currentSrc||img.src,loaded:false}}}));
  for(const url of urls){const image=new Image();const done=new Promise(resolve=>{image.onload=()=>resolve({url,loaded:image.naturalWidth>0,width:image.naturalWidth});image.onerror=()=>resolve({url,loaded:false});});image.src=url;reports.push(await done);}
  return {fonts:document.fonts.status,fontFamilies:[...new Set([...document.querySelectorAll('*')].filter(e=>e.textContent?.trim()).map(e=>getComputedStyle(e).fontFamily))],images:reports,loaded:document.fonts.status==='loaded'&&reports.every(r=>r.loaded)};
 });
}
async function inspect(page){return page.evaluate(()=>{
 const parse=color=>{const n=color.match(/[\d.]+/g)?.map(Number)||[];return n.length>=3?[n[0],n[1],n[2],n[3]??1]:[0,0,0,0]};
 const blend=(fg,bg)=>[...fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3])),1];
 const background=e=>{if(!e)return[255,255,255,1];const b=parse(getComputedStyle(e).backgroundColor);return b[3]===1?b:blend(b,background(e.parentElement));};
 const luminance=a=>{const n=a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*n[0]+.7152*n[1]+.0722*n[2]};
 const contrast=(fg,bg)=>{const a=luminance(blend(fg,bg)),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 const text=[],icons=[];for(const e of document.querySelectorAll('*')){const s=getComputedStyle(e),r=e.getBoundingClientRect();if(r.width<=0||r.height<=0||s.visibility==='hidden'||s.display==='none')continue;
  if([...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())||e.matches('input,textarea')){const bg=background(e),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseFloat(s.fontWeight)>=700),ratio=contrast(parse(s.color),bg);text.push({text:(e.value||[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('')).trim().slice(0,110),color:s.color,background:bg,fontSize:s.fontSize,fontWeight:s.fontWeight,ratio:Math.round(ratio*100)/100,required:large?3:4.5,disabled:!!e.closest('[aria-disabled="true"],:disabled'),role:e.getAttribute('role'),testId:e.getAttribute('data-testid')});}
  if(e.tagName.toLowerCase()==='svg'){const stroke=e.getAttribute('stroke')||s.stroke;if(stroke&&stroke!=='none'&&stroke!=='currentColor'){const ratio=contrast(parse(stroke),background(e));icons.push({stroke,background:background(e),ratio:Math.round(ratio*100)/100,disabled:!!e.closest('[aria-disabled="true"],:disabled')});}}
 }
 const scroll=[document.scrollingElement,...document.querySelectorAll('*')].filter((e,i,a)=>e&&a.indexOf(e)===i&&e.clientHeight>100&&e.scrollHeight>e.clientHeight+5&&(/auto|scroll/.test(getComputedStyle(e).overflowY)||e===document.scrollingElement)).map(e=>({testId:e.getAttribute('data-testid'),height:e.clientHeight,content:e.scrollHeight,top:e.scrollTop}));
 return {text,icons,scroll,body:document.body.innerText,setup:document.documentElement.dataset.reviewSetup,setupError:document.documentElement.dataset.reviewSetupError,background:getComputedStyle(document.body).backgroundColor,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
 });}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
 for(const spec of specs)for(const theme of['light','dark']){
  const previous=ledger.results.find(r=>r.key===spec.key&&r.theme===theme);if(previous&&!retry)continue;if(retry&&previous?.status==='rendered'&&previous.sourceIdentity===sourceIdentity)continue;
  const u=offline?require('node:url').pathToFileURL(__dirname+'/offline/mobile.html'):new URL(spec.url);if(offline)u.search=new URL(spec.url).search;u.searchParams.set('theme',theme);const ctx=await browser.newContext({viewport:spec.viewport,colorScheme:theme});
  await ctx.route('**/*',r=>/^file:|^data:|^blob:/.test(r.request().url())||( !offline&&/^http:\/\/127\.0\.0\.1:4207\//.test(r.request().url()))?r.continue():r.abort());
  const page=await ctx.newPage(),errors=[],failedRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  let row={key:spec.key,route:spec.route,theme,url:u.href,viewport:spec.viewport,sourceIdentity,fixture:new URL(spec.url).search,readinessGate:null,status:'blocked'};
  try{
   await page.goto(u.href,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(150);if(errors.length)throw Error(errors.join('; '));row.readinessGate=await readiness(page);
   if(spec.key==='request-pass:review'){await page.getByRole('textbox',{name:'Service request details',exact:true}).fill('Synthetic inquiry: help with a small kitchen repair.');await page.getByRole('radio',{name:'Can we access the work area?: Yes',exact:true}).click();await page.getByRole('textbox',{name:'Preferred timing',exact:true}).fill('Weekday mornings');await page.getByRole('textbox',{name:'Project notes',exact:true}).fill('Synthetic review only.');await page.getByRole('button',{name:'Review request',exact:true}).click();}
   await page.waitForTimeout(200);const before=await inspect(page);row.audit=before;
   const file=spec.key.replace(/[^a-z0-9-]/gi,'_')+'-'+theme;
   row.top='captures/'+file+'-top.png';await page.screenshot({path:runner+'/public/'+row.top});
   // Full document is valid only when content scrolls at document level.
   if(!before.scroll.some(s=>s.testId!==null||s.height<spec.viewport.height-10)&&await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+5)){row.full='captures/'+file+'-full.png';await page.screenshot({path:runner+'/public/'+row.full,fullPage:true});}
   row.scrollReached=await page.evaluate(()=>[document.scrollingElement,...document.querySelectorAll('*')].filter((e,i,a)=>e&&a.indexOf(e)===i&&e.clientHeight>100&&e.scrollHeight>e.clientHeight+5&&(/auto|scroll/.test(getComputedStyle(e).overflowY)||e===document.scrollingElement)).map(e=>{e.scrollTop=e.scrollHeight;return{height:e.clientHeight,content:e.scrollHeight,bottom:e.scrollTop+e.clientHeight>=e.scrollHeight-3}}));
   await page.waitForTimeout(80);row.bottom='captures/'+file+'-lower.png';await page.screenshot({path:runner+'/public/'+row.bottom});
   const blockers=[];if(!row.readinessGate.loaded)blockers.push('Image/font readiness failed');if(errors.length)blockers.push(errors.join('; '));if(before.body.includes('Render access limited'))blockers.push(before.body.slice(0,220));if(before.setup==='manual')blockers.push(before.setupError);if(before.body.startsWith('Route redirect:'))blockers.push('Native redirect route; browser adapter does not emulate route stack');
   row.status=blockers.length?'blocked':'rendered';row.blocker=blockers.join('; ')||null;row.errors=errors;row.failedRequests=failedRequests;
   row.contrastFindings=before.text.filter(x=>!x.disabled&&x.ratio<x.required);row.iconFindings=before.icons.filter(x=>!x.disabled&&x.ratio<3);
  }catch(e){if(/ERR_NETWORK_ACCESS_DENIED|ERR_ACCESS_DENIED/.test(e.message)){await browser.close();throw e;}row.blocker=e.message;row.errors=errors;row.failedRequests=failedRequests;row.diagnostic='captures/'+spec.key.replace(/[^a-z0-9-]/gi,'_')+'-'+theme+'-diagnostic.png';await page.screenshot({path:runner+'/public/'+row.diagnostic}).catch(()=>{});}
  ledger.results=ledger.results.filter(r=>!(r.key===spec.key&&r.theme===theme));ledger.results.push(row);save();console.log(JSON.stringify({key:spec.key,theme,status:row.status,blocker:row.blocker,contrast:row.contrastFindings?.length,images:row.readinessGate?.images.length}));await ctx.close();if(errors.some(e=>/process is not defined|Unexpected end of input|already been declared/.test(e))){await browser.close();throw Error(row.blocker);}
 }
 await browser.close();if(sourceIdentity!==identity())throw Error('Source changed during captures; retain original attribution and recapture');
 console.log(JSON.stringify({rendered:ledger.results.filter(r=>r.status==='rendered').length,blocked:ledger.results.filter(r=>r.status==='blocked').length,remaining:ledger.specs.length*2-ledger.results.length,sourceIdentity}));
})().catch(e=>{console.error(e);process.exitCode=1});
