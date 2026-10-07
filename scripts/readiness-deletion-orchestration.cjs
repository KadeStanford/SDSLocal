const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(path.join(root,'node_modules/typescript'));
const output=path.join(root,'reports/readiness/security');fs.mkdirSync(output,{recursive:true});
const sourceFile=path.join(root,'supabase/functions/delete-account/index.ts'),source=fs.readFileSync(sourceFile,'utf8');
const ast=ts.createSourceFile('index.ts',source,ts.ScriptTarget.Latest,true);
const body=ast.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(ast)).join('\n');
const compiled=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const helperModule={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync(path.join(root,'supabase/functions/_shared/account-deletion.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(helperModule.exports,helperModule);
async function scenario({provider='square',shared=false,stale=false,invalidAuth=false,confirmation='DELETE',finishError=false}={}){
const calls=[],disconnects=[];let handler,coOwner=false;
const admin={auth:{getUser:async()=>invalidAuth?{data:{user:{id:'departing-owner'}},error:{message:'expired'}}:{data:{user:{id:'departing-owner'}},error:null}},storage:{from:()=>({list:async()=>({data:[],error:null}),remove:async()=>({error:null})})},
rpc:async(name,args)=>{calls.push({name,args});if(name==='begin_account_deletion'){if(stale)coOwner=true;return{data:{jobId:'fixture-job',status:'pending',impact:{businesses:[{id:'fixture-business',action:shared?'remove_membership':'delete_business'}]},storageTargets:[]},error:null}}if(name==='finish_account_deletion_cleanup'&&finishError)return{data:null,error:{message:'acknowledgement failed'}};return{data:null,error:null}},
from:table=>{const result={data:(table==='square_connections'&&provider==='square')||(table==='stripe_account_states'&&provider==='stripe')?[{business_id:'fixture-business'}]:[],error:null};const query={select(){return this},in(){return this},eq(){return this},then(resolve,reject){return Promise.resolve(result).then(resolve,reject)}};return query;}};
class SquareService{async disconnect(id,user,confirmed){assert.equal(confirmed,true);disconnects.push({provider:'square',id,user,coOwnerAtDisconnect:coOwner})}}
class StripeService{async disconnect(input,user){assert.equal(input.confirmed,true);disconnects.push({provider:'stripe',id:input.businessId,user,coOwnerAtDisconnect:coOwner})}}
const dependency={createClient:()=>admin,SquareService,StripeService,squareConfig:()=>({}),stripeConfig:()=>({}),CommerceError:class extends Error{},...helperModule.exports,Deno:{env:{get:key=>key==='SUPABASE_URL'?'http://local-fixture.invalid':key==='SUPABASE_SERVICE_ROLE_KEY'?'local-fixture-no-credential':undefined},serve:fn=>handler=fn}};
new Function(...Object.keys(dependency),compiled)(...Object.values(dependency));
const response=await handler(new Request('http://local-fixture.invalid/delete-account',{method:'DELETE',headers:{Authorization:'Bearer synthetic-fixture', 'Content-Type':'application/json'},body:JSON.stringify({confirmation})}));
return{status:response.status,body:await response.json(),calls:calls.map(c=>c.name),disconnects,coOwner};}
async function main(){const report={startedAtUtc:new Date().toISOString(),sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),scope:'Actual Edge request handler transpiled without imports; actual pure deletion helpers; all DB/storage/provider/auth boundaries replaced with local deterministic fixtures. No credentials, external requests or real deletion. Co-owner sequence is orchestration reproduction, not a full PostgreSQL/provider race trial.',checks:[]};
const cases=[
['expired-auth-no-work',{invalidAuth:true},r=>{assert.equal(r.status,401);assert.deepEqual(r.calls,[]);assert.deepEqual(r.disconnects,[])}],
['invalid-confirmation-no-work',{confirmation:'not DELETE'},r=>{assert.equal(r.status,400);assert.deepEqual(r.calls,[])}],
['saved-shared-business-preserves-provider',{shared:true},r=>{assert.equal(r.status,200);assert.deepEqual(r.disconnects,[])}],
['late-co-owner-preserves-square',{stale:true,provider:'square'},r=>{assert.equal(r.coOwner,true);assert.equal(r.disconnects.length,0,'Saved sole-owner impact caused Square disconnect after co-owner activation')}],
['late-co-owner-preserves-stripe',{stale:true,provider:'stripe'},r=>{assert.equal(r.coOwner,true);assert.equal(r.disconnects.length,0,'Saved sole-owner impact revoked Stripe after co-owner activation')}],
['cleanup-acknowledgement-failure-reported-pending',{shared:true,finishError:true},r=>{assert.equal(r.status,200);assert.equal(r.body.deleted,true);assert.equal(r.body.cleanupPending,true,'DB cleanup acknowledgement error was silently reported as fully complete')}],
];for(const[id,input,check]of cases){const result=await scenario(input);let error=null;try{check(result)}catch(e){error=e.message}report.checks.push({id,status:error?'failed':'passed',result,error,completedAtUtc:new Date().toISOString()});}
report.completedAtUtc=new Date().toISOString();report.passed=report.checks.filter(c=>c.status==='passed').length;report.failed=report.checks.filter(c=>c.status==='failed').length;const phase=process.argv.includes('--before')?'before':'after';fs.writeFileSync(path.join(output,'deletion-orchestration-'+phase+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,passed:report.passed,failed:report.failed,failures:report.checks.filter(c=>c.status==='failed').map(c=>({id:c.id,error:c.error}))}));if(report.failed)process.exitCode=1;}
main().catch(e=>{console.error(e);process.exitCode=1});
