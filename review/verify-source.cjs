const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dependencies='F:/BusinessApp',ts=require(dependencies+'/node_modules/typescript');
const config=JSON.parse(fs.readFileSync(root+'/apps/mobile/tsconfig.json','utf8'));config.extends=require.resolve(dependencies+'/apps/mobile/node_modules/expo/tsconfig.base.json');
const parsed=ts.parseJsonConfigFileContent(config,ts.sys,root+'/apps/mobile');
parsed.options.paths={...parsed.options.paths,...Object.fromEntries(['api-client','business-logic','design-tokens','image-processing-config','types','validation'].map(n=>['@sds/'+n,[root+'/packages/'+n+'/src/index.ts']]))};
const host=ts.createCompilerHost(parsed.options);
const program=ts.createProgram(parsed.fileNames,{...parsed.options,noEmit:true},host),errors=[...parsed.errors,...ts.getPreEmitDiagnostics(program)];
const report={at:new Date().toISOString(),source:root,files:parsed.fileNames.length,passed:errors.length===0,diagnostics:errors.map(d=>({file:d.file?path.relative(root,d.file.fileName):null,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}))};
fs.mkdirSync(__dirname+'/evidence',{recursive:true});fs.writeFileSync(__dirname+'/evidence/typecheck.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,diagnostics:report.diagnostics.slice(0,8),diagnosticCount:report.diagnostics.length},null,2));process.exitCode=errors.length?1:0;
