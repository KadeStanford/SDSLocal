const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=path.resolve(__dirname,'..'),config=root+'/apps/mobile/tsconfig.json',saved=fs.readFileSync(config);const json=JSON.parse(saved);json.extends=require.resolve('F:/BusinessApp/apps/mobile/node_modules/expo/tsconfig.base.json');
fs.writeFileSync(config,JSON.stringify(json,null,2));
const temp=__dirname+'/.test-temp';fs.mkdirSync(temp,{recursive:true});
try{const r=cp.spawnSync(process.execPath,['F:/BusinessApp/node_modules/vitest/vitest.mjs','run','--config',__dirname+'/vitest.config.mjs',...process.argv.slice(2)],{cwd:root,env:{...process.env,TEMP:temp,TMP:temp},encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true});fs.writeFileSync(__dirname+'/evidence/'+(process.argv.length>2?'focused-tests.log':'mobile-tests.log'),(r.stdout||'')+(r.stderr||''));console.log((r.stdout||'').slice(-1500));console.error((r.stderr||'').slice(-1500));process.exitCode=r.status;}finally{fs.writeFileSync(config,saved);}
