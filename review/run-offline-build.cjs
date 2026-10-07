const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),config=root+'/apps/mobile/tsconfig.json',saved=fs.readFileSync(config);
const parsed=JSON.parse(saved);parsed.extends=require.resolve('F:/BusinessApp/apps/mobile/node_modules/expo/tsconfig.base.json').replaceAll('\\','/');
fs.writeFileSync(config,JSON.stringify(parsed,null,2));
try {const r=cp.spawnSync(process.execPath,['build.mjs'],{cwd:__dirname+'/runner',encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exitCode=r.status;}finally{fs.writeFileSync(config,saved);}
