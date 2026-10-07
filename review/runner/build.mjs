import fs from 'node:fs';import path from 'node:path';import {createRequire}from'node:module';
const require=createRequire(import.meta.url);const appRoot="F:/BusinessApp/.codex-tmp/parish-pass-dark-review/apps/mobile";const workspace="F:/BusinessApp/.codex-tmp/parish-pass-dark-review";const depRoot="F:/BusinessApp/apps/mobile";
const vitePath=fs.readdirSync('F:/BusinessApp/node_modules/.pnpm').find(x=>x.startsWith('vite@'));
const {build}=await import('file:///F:/BusinessApp/node_modules/.pnpm/'+vitePath+'/node_modules/vite/dist/node/index.js');
const ts=require('F:/BusinessApp/node_modules/typescript');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);}
const imports=new Map();
for(const file of walk(appRoot+'/src').filter(f=>/\.[jt]sx?$/.test(f)&&!f.includes('.test.'))){const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);for(const n of sf.statements){if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)){const m=n.moduleSpecifier.text;let names=imports.get(m)||new Set();if(n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))for(const e of n.importClause.namedBindings.elements)if(!e.isTypeOnly)names.add(e.propertyName?.text||e.name.text);imports.set(m,names);}}}
// Namespace imports also need explicit runner exports; all effects stay local.
for (const file of walk(appRoot+'/src').filter(f=>/\.[jt]sx?$/.test(f)&&!f.includes('.test.'))) {
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true), ns=new Map();
 for(const n of sf.statements) if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamespaceImport(n.importClause.namedBindings)) ns.set(n.importClause.namedBindings.name.text,n.moduleSpecifier.text);
 function visit(n){if(ts.isPropertyAccessExpression(n)&&ts.isIdentifier(n.expression)&&ns.has(n.expression.text)){const id=ns.get(n.expression.text),names=imports.get(id)||new Set();names.add(n.name.text);imports.set(id,names);}ts.forEachChild(n,visit);}visit(sf);
}
const native=path.resolve('native.tsx').replaceAll('\\','/'),fixtures=path.resolve('fixtures.ts').replaceAll('\\','/'),providers=path.resolve('providers.tsx').replaceAll('\\','/');
const coreNative=new Set(['expo-router','react-native-safe-area-context','expo-image','expo-symbols']);
const shim=(id)=>{
 if(coreNative.has(id))return `export * from '${native}';`;
 if(id.startsWith('@/providers/'))return `export * from '${providers}';${[...imports.get(id)||[]].filter(n=>n.endsWith('Provider')).map(n=>`export {passthrough as ${n}} from '${providers}';`).join('')}`;
 if(id==='@/hooks/use-color-scheme')return `export {useColorScheme} from '${providers}';`;
 if(id==='@/lib/supabase')return `export {supabase,isSupabaseConfigured} from '${fixtures}';`;
 if(id==='@/lib/square-commerce')return `export * from '${fixtures}';`;
 if(id==='@/lib/appointment-commerce')return `export {appointmentCommerce,readAppointmentAccess,readGuestAppointmentIds,saveAppointmentAccess,appointmentAccess} from '${fixtures}';`;
 if(id==='@/lib/storage-url')return `export const storagePublicUrl=p=>p.startsWith("fixture-assets/")?"/"+p:p;export const storageSignedUrl=async p=>p;`;
 if(id==='@/lib/haptics')return `export const haptics={selection:()=>{},success:()=>{},error:()=>{},impact:()=>{}};`;
 if(id==='@/lib/discovery-history-storage')return `export const discoveryHistory={read:()=>[],record:()=>{}};`;
 if(id==='expo-linking')return `export const getInitialURL=async()=>location.href;export const addEventListener=()=>({remove:()=>{}});export const openURL=async()=>{};export const canOpenURL=async()=>false;export const createURL=path=>'parishpass://'+path.replace(/^\\//,'');export const parse=value=>{const u=new URL(value);return {scheme:u.protocol.replace(':',''),hostname:u.hostname,path:u.pathname,queryParams:Object.fromEntries(u.searchParams)};};`;
 if(id==='expo-constants')return `export default {expoConfig:{extra:{},scheme:'parishpass'},easConfig:{projectId:'local-review'}};`;
 if(id==='expo-web-browser')return `export const maybeCompleteAuthSession=()=>{};export const openAuthSessionAsync=async()=>({type:'cancel'});export const openBrowserAsync=async()=>({type:'cancel'});`;
 if(id==='expo-camera')return `import {NativeComponent}from'${native}';export const CameraView=NativeComponent;export const useCameraPermissions=()=>[{granted:false,canAskAgain:true},async()=>({granted:false})];`;
 if(id==='expo-crypto')return `export const randomUUID=()=>globalThis.crypto.randomUUID();export const getRandomBytesAsync=async n=>globalThis.crypto.getRandomValues(new Uint8Array(n));`;
 if(id==='@react-native-community/netinfo')return `const info={isConnected:true,isInternetReachable:true};export default {fetch:async()=>info,addEventListener:fn=>{fn(info);return ()=>{}}};export const useNetInfo=()=>info;`;
 if(id==='react-native-svg')return `import React from 'react';export default ({children,...p})=>React.createElement('svg',p,children);${[...imports.get(id)||[]].map(n=>`export const ${n}=p=>React.createElement('${n.toLowerCase()}',p);`).join('')}`;
 if(id==='react-native-gesture-handler')return `import React from 'react';import {View} from 'react-native-web';export const GestureHandlerRootView=View;export const GestureDetector=({children})=>children;const g=new Proxy(()=>g,{get:()=>g,apply:()=>g});export const Gesture=g;${[...imports.get(id)||[]].filter(n=>!['Gesture','GestureDetector','GestureHandlerRootView'].includes(n)).map(n=>`export const ${n}=View;`).join('')}`;
 if(id==='react-native-reanimated')return `import React from 'react';import {View}from'react-native-web';export default {View};export const useSharedValue=v=>({value:v});export const useAnimatedStyle=f=>f();export const withTiming=v=>v;export const runOnJS=f=>f;${[...imports.get(id)||[]].filter(n=>!['useSharedValue','useAnimatedStyle','withTiming','runOnJS'].includes(n)).map(n=>`export const ${n}=(v)=>v;`).join('')}`;
 const names=[...imports.get(id)||[]];return `import {nativeCall,NativeComponent}from'${native}';export default NativeComponent;${names.map(n=>`export const ${n}=${/^[A-Z]/.test(n)?'NativeComponent':'nativeCall'};`).join('')}`;
};
function shouldShim(id){return coreNative.has(id)||id.startsWith('expo-')||id.startsWith('@expo/ui')||['react-native-svg','react-native-qrcode-svg','react-native-gesture-handler','react-native-reanimated','react-native-worklets','react-native-purchases','react-native-webview','@react-native-google-signin/google-signin','@react-native-community/netinfo','@stripe/stripe-react-native'].includes(id)||id.startsWith('@/providers/')||['@/hooks/use-color-scheme','@/lib/supabase','@/lib/square-commerce','@/lib/appointment-commerce','@/lib/storage-url','@/lib/haptics','@/lib/discovery-history-storage'].includes(id);}
const routes={};for(const file of walk(appRoot+'/src/app').filter(f=>f.endsWith('.tsx')&&!f.endsWith('_layout.tsx'))){const rel=path.relative(appRoot+'/src/app',file).replaceAll('\\','/');const name=rel.replace('(tabs)/','').replace('.tsx','');routes[name]='/@fs/'+file.replaceAll('\\','/');}
fs.writeFileSync('routes-'+(4207)+'.ts','export const routes='+JSON.stringify(routes)+';');
const result=await build({
 build:{lib:{entry:path.resolve('main-static.tsx'),formats:['iife'],name:'ParishPassReview'},write:false,cssCodeSplit:false,minify:false,assetsInlineLimit:10000000},root:process.cwd(),cacheDir:path.resolve('.vite-cache-source-audit-bundled-'+(process.argv[2]||'baseline')),
 plugins:[{name:'local-review-native-adapters',enforce:'pre',
  transformIndexHtml(html){
   // Load the actual app's declared web font variables; do not invent fonts/insets.
   const css=fs.readFileSync(appRoot+'/src/global.css','utf8');
   return html.replace('</head>','<style data-source="apps/mobile/src/global.css">'+css+'</style></head>');
  },
  resolveId(id,importer){
   // Relative imports inside real route modules must share the same fixture boundary.
   if(id.startsWith('.')&&importer?.replaceAll('\\','/').startsWith(appRoot.replaceAll('\\','/')+'/src/'))id=path.resolve(path.dirname(importer.split('?')[0]),id);
   // Renderer audit only: official SVG library plus native decorative prop translation.
   if(id==='react-native-svg')return path.resolve('svg-web-adapter.tsx');
   if(id==='./routes')return path.resolve('routes-static.ts');
   const normalized=id.replaceAll('\\','/');
   const normalizedRoot=appRoot.replaceAll('\\','/');
   const candidate=normalized.startsWith(normalizedRoot+'/src/')?'@/'+normalized.slice(normalizedRoot.length+5).replace(/\.[jt]sx?$/,''):id;
   if(shouldShim(candidate))return '\0review:'+candidate;
  },
  load(id){if(id.startsWith('\0review:'))return shim(id.slice(8));}
 }],
 resolve:{alias:{zod:"F:/BusinessApp/node_modules/.pnpm/zod@4.6.5/node_modules/zod/index.cjs",'@review-source':appRoot+'/src','@sds/design-tokens':workspace+'/packages/design-tokens/src/index.ts','@sds/validation':workspace+'/packages/validation/src/index.ts','@sds/business-logic':workspace+'/packages/business-logic/src/index.ts','@sds/types':workspace+'/packages/types/src/index.ts','@sds/image-processing-config':workspace+'/packages/image-processing-config/src/index.ts','@':appRoot+'/src','react-native-web':path.dirname(require.resolve(depRoot+'/node_modules/react-native-web/package.json')),'react-native-svg':path.resolve('svg-web-adapter.tsx'),'@parish-audit/svg-library':path.resolve(depRoot,'node_modules/react-native-svg/src/ReactNativeSVG.web.ts'),'react-native':path.resolve('text-scale-native.tsx'),'react':path.dirname(require.resolve(depRoot+'/node_modules/react/package.json')),'react-dom':path.dirname(require.resolve(depRoot+'/node_modules/react-dom/package.json'))},extensions:['.web.jsx','.web.js','.web.tsx','.web.ts','.tsx','.ts','.jsx','.js','.json'],dedupe:['react','react-dom']},
 define:{'process.env':JSON.stringify({NODE_ENV:'production'}),'process.env.EXPO_PUBLIC_APP_ENV':'"staging"','process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED':'"false"',__DEV__:'true'},
 optimizeDeps:{include:['react','react-dom/client','react-native-web','@parish-audit/svg-library'],exclude:['expo-router'],rolldownOptions:{resolve:{extensions:['.web.tsx','.web.ts','.web.jsx','.web.js','.tsx','.ts','.jsx','.js','.json']}}},
 server:{host:'127.0.0.1',port:Number(4207),strictPort:true,fs:{allow:[workspace,'F:/BusinessApp/node_modules','F:/BusinessApp/apps/mobile/node_modules']}}
});
const output=Array.isArray(result)?result[0].output:result.output;
const js=output.filter(x=>x.type==='chunk').map(x=>x.code).join('\n');
const css=output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
if(output.filter(x=>x.type==='chunk').length!==1)throw Error('Offline review requires one embedded bundle');
const base=fs.readFileSync('index.html','utf8').replace('<script type="module" src="/main.tsx"></script>','');
const boot='globalThis.process={env:{NODE_ENV:"production",EXPO_PUBLIC_APP_ENV:"staging",EXPO_PUBLIC_GOOGLE_AUTH_ENABLED:"false"}};';
const html=base.replace('</head>',()=>'<style>'+css+'</style></head>').replace('</body>',()=>'<script>'+boot+js.replaceAll('</script','<'+String.fromCharCode(92)+'/script')+'</script></body>');
fs.mkdirSync('../offline',{recursive:true});fs.writeFileSync('../offline/mobile.html',html);console.log('OFFLINE_BUNDLE_READY '+html.length+' bytes');
