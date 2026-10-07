const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..').replaceAll('\\','/'),runner=__dirname+'/runner';
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(p,d.name)):[path.join(p,d.name)]);}
const routes=walk(root+'/apps/mobile/src/app').filter(p=>p.endsWith('.tsx')&&!p.endsWith('_layout.tsx'));
fs.writeFileSync(runner+'/routes-static.ts','export const routes={'+routes.map(p=>JSON.stringify(path.relative(root+'/apps/mobile/src/app',p).replaceAll('\\','/').replace('(tabs)/','').replace('.tsx',''))+':()=>import('+JSON.stringify('@review-source/app/'+path.relative(root+'/apps/mobile/src/app',p).replaceAll('\\','/'))+')').join(',')+'};');
const assetMap={};for(const p of walk(runner+'/public/fixture-assets')){const ext=path.extname(p).slice(1),mime=ext==='svg'?'image/svg+xml':ext==='jpg'?'image/jpeg':'image/'+ext;assetMap['/fixture-assets/'+path.relative(runner+'/public/fixture-assets',p).replaceAll('\\','/')]='data:'+mime+';base64,'+fs.readFileSync(p).toString('base64');}
fs.writeFileSync(runner+'/asset-map.ts','export const assets='+JSON.stringify(assetMap));
let native=fs.readFileSync(runner+'/native.tsx','utf8');
native=native.replace(/import \{AppIcon\} from [^;]+;/,"import {AppIcon} from '@/components/app-icon';\nimport {assets} from './asset-map';");
native=native.replace("const resolved=candidate?.uri?.startsWith('https://local-fixture.invalid/')?{uri:candidate.uri.replace('https://local-fixture.invalid',location.origin)}:candidate;", "const uri=candidate?.uri?.replace('https://local-fixture.invalid','');const resolved=uri&&assets[uri]?{uri:assets[uri]}:candidate;");
fs.writeFileSync(runner+'/native.tsx',native);
const main=`import './review-recipes';
import React,{Suspense} from 'react';import {createRoot}from'react-dom/client';
import {routes}from'./routes';import {Colors}from'@/constants/theme';import {scheme,fixtureNotice}from'./fixtures';
const p=new URLSearchParams(location.search),screen=p.get('screen')||'explore';
document.body.style.backgroundColor=Colors[scheme].background;document.body.style.color=Colors[scheme].text;document.documentElement.style.colorScheme=scheme;
class Boundary extends React.Component<any,{error:string|null}>{state={error:null};static getDerivedStateFromError(e:any){return{error:e.message}}componentDidCatch(error:any){console.error('REVIEW_RENDER_LIMIT',error.stack)}render(){return this.state.error?<div role="alert" style={{padding:24}}><h1>Render access limited</h1><p>{this.state.error}</p><p>Local renderer boundary limitation.</p></div>:this.props.children}}
const Screen=React.lazy(async()=>{const source=(routes as any)[screen];if(!source)throw Error('Unknown screen '+screen);return source();});
createRoot(document.getElementById('root')!).render(<Boundary><Suspense fallback={<div style={{padding:24}}>Loading actual screen…</div>}><Screen/></Suspense></Boundary>);document.documentElement.dataset.fixtureNotice=fixtureNotice;`;
fs.writeFileSync(runner+'/main-static.tsx',main);
let s=fs.readFileSync(runner+'/server.mjs','utf8');
s=s.replace('const {createServer}=await import','const {build}=await import').replace('const server=await createServer({','const result=await build({');
s=s.replace("if(id==='./routes')return path.resolve('routes-'+(4207)+'.ts');","if(id==='./routes')return path.resolve('routes-static.ts');");
s=s.replace("alias:{'@sds/design-tokens'","alias:{'@review-source':appRoot+'/src','@sds/design-tokens'");
s=s.replace("root:process.cwd(),cacheDir:","build:{lib:{entry:path.resolve('main-static.tsx'),formats:['iife'],name:'ParishPassReview'},write:false,cssCodeSplit:false,minify:false,assetsInlineLimit:10000000},root:process.cwd(),cacheDir:");
s=s.replace(/await server\.listen\(\);[\s\S]*$/,"const output=Array.isArray(result)?result[0].output:result.output;const js=output.filter(x=>x.type==='chunk').map(x=>x.code).join('\\n');const css=output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\\n');if(output.filter(x=>x.type==='chunk').length!==1)throw Error('Offline review requires one embedded bundle');const base=fs.readFileSync('index.html','utf8').replace('<script type=\"module\" src=\"/main.tsx\"></script>','');const html=base.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+js.replaceAll('</script','<\\\\/script')+'</script></body>');fs.mkdirSync('../offline',{recursive:true});fs.writeFileSync('../offline/mobile.html',html);console.log('OFFLINE_BUNDLE_READY '+html.length+' bytes');");
fs.writeFileSync(runner+'/build.mjs',s);
console.log('Offline source bundle configuration prepared; no browser/network access used.');
