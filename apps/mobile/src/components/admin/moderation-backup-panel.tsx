import {useEffect,useRef,useState} from 'react';
import {Switch,TextInput,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {AppButton} from '@/components/app-button';
import {ModerationFailure} from '@/lib/admin/mobile-moderation-client';
import type {BackupSettings,BackupStatus,BackupRun,BackupMode} from '@/lib/admin/backup-types';
import type {PlatformAdminAccess} from '@/hooks/use-platform-admin-access';
import {AdminSection,AdminText} from './admin-frame';
import {adminStyles as s} from './mobile-admin.styles';

export function ModerationBackupPanel({access}:{access:PlatformAdminAccess}) {
 const {client,accountId,invalidate}=access;
 const [status,setStatus]=useState<BackupStatus|null>(null),[run,setRun]=useState<BackupRun|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[expanded,setExpanded]=useState(false);
 const sequence=useRef(0);
 const fail=(e:unknown)=>{setError(e instanceof Error?e.message:'The backup request failed. Try again.');if(e instanceof ModerationFailure&&['denied','signed_out','session_changed'].includes(e.kind))access.invalidate(e);};
 useEffect(()=>{let active=true;const seq=++sequence.current;
  void client.backupStatus(accountId).then(value=>{if(active&&seq===sequence.current)setStatus(value);}).catch(e=>{
   if(active&&seq===sequence.current){setError(e instanceof Error?e.message:'Backup status unavailable.');if(e instanceof ModerationFailure&&['denied','signed_out','session_changed'].includes(e.kind))invalidate(e);}
  });return()=>{active=false;};
 },[client,accountId,invalidate]);
 async function refresh(){const seq=++sequence.current;setBusy(true);setError(null);
  try{const value=await access.client.backupStatus(access.accountId);if(seq===sequence.current)setStatus(value);}catch(e){if(seq===sequence.current)fail(e);}finally{if(seq===sequence.current)setBusy(false);}}
 return <AdminSection title="Your moderation backup">
  <AdminText>{status?.policy.mode==='enabled'?(status.worker_status==='recent'?'Automatic backup is on.':'Automatic rules enabled. Check recent activity.'):status?.policy.mode==='off'?'Automatic backup is paused.':'Check first, then turn it on.'}</AdminText>
  {status?.policy.mode==='enabled'&&status.worker_status!=='recent'&&<AdminText>{status.worker_status==='stale'?'The last automatic check was over 10 minutes ago. Review cases yourself until checks resume.':'Waiting for the first automatic check. Enabling rules alone does not confirm checks are running.'}</AdminText>}
  <AdminText>Returns incomplete listings to draft and temporarily hides repeated promotional review templates. Shared contacts and reporting bursts are flagged for you.</AdminText>
  <AdminText muted>Your decisions take priority. Reopen listings or restore reviews when needed. Nothing is automatically approved, banned or deleted.</AdminText>
  {error&&<AdminText>{error}</AdminText>}
  <AppButton label="See what the backup would do" variant="secondary" disabled={busy} onPress={()=>{const seq=++sequence.current;setBusy(true);setError(null);
   void access.client.previewBackup(access.accountId,Crypto.randomUUID()).then(value=>{if(seq===sequence.current)setRun(value);}).catch(e=>{if(seq===sequence.current)fail(e);}).finally(()=>{if(seq===sequence.current)setBusy(false);});}}/>
  {run&&<><AdminText>{run.entries.length} proposed actions. This preview changes no data.</AdminText>{run.entries.slice(0,5).map(x=><AdminText key={`${x.kind}:${x.id}`}>{x.action==='flag'?'Flag for you':x.action==='hide'?'Temporarily hide review':'Return listing to draft'}: {x.reason}</AdminText>)}</>}
  <AppButton label="Refresh backup status" variant="secondary" disabled={busy} onPress={()=>void refresh()}/>
  {status&&<><AppButton label={expanded?'Hide backup settings':'Backup settings and activity'} variant="secondary" onPress={()=>setExpanded(x=>!x)}/>
   {expanded&&<><BackupForm key={status.policy.revision} status={status} access={access} onSaved={value=>{setStatus(value);setRun(null);}}/>
    <AdminText muted>{status.handled} cases handled or flagged. Rules {status.policy.version}.</AdminText>
    {status.runs.slice(0,3).map(x=><AdminText key={x.request_id}>{x.applied} reversible changes, {x.flagged} flags.</AdminText>)}</>}
  </>}
 </AdminSection>;
}
function BackupForm({status,access,onSaved}:{status:BackupStatus;access:PlatformAdminAccess;onSaved:(value:BackupStatus)=>void}){
 const p=status.policy;const [mode,setMode]=useState<BackupMode>(p.mode),[missing,setMissing]=useState(p.missing_information),[spam,setSpam]=useState(p.promotional_reviews),[flags,setFlags]=useState(p.internal_flags),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[uncertain,setUncertain]=useState(false);
 const pending=useRef<Readonly<BackupSettings>|null>(null);const locked=busy||uncertain;
 async function save(){if(busy||reason.trim().length<10||(mode==='enabled'&&!confirmed))return;
  pending.current??=Object.freeze({mode,missing,spam,flags,reason:reason.trim(),revision:p.revision,requestId:Crypto.randomUUID()});
  setBusy(true);setError(null);
  try{const value=await access.client.configureBackup(access.accountId,pending.current);pending.current=null;onSaved(value);}
  catch(e){setError(e instanceof Error?e.message:'Settings response uncertain. Retry the same settings.');setUncertain(true);
   if(e instanceof ModerationFailure&&['denied','signed_out','session_changed'].includes(e.kind))access.invalidate(e);
  }finally{setBusy(false);}
 }
 return <View style={s.separator}>
  {(['off','dry_run','enabled'] as const).map(value=><AppButton key={value} label={`${value===mode?'Selected: ':''}${value==='off'?'Paused':value==='dry_run'?'Check only':'Automatic reversible actions'}`} variant="secondary" disabled={locked} onPress={()=>{setMode(value);setConfirmed(false);}}/>)}
  {([['Return incomplete listings to draft',missing,setMissing],['Temporarily hide exact promotions',spam,setSpam],['Flag duplicates and bursts',flags,setFlags]] as const).map(([label,value,set])=><View key={label} style={s.row}><Switch accessibilityLabel={label} value={value} disabled={locked} onValueChange={set}/><AdminText>{label}</AdminText></View>)}
  <AdminText>Why change the settings?</AdminText><TextInput accessibilityLabel="Backup settings reason" value={reason} onChangeText={setReason} multiline maxLength={1000} editable={!locked} style={[s.input,s.multiline]}/>
  {mode==='enabled'&&<View style={s.row}><Switch accessibilityLabel="Confirm automatic reversible moderation" value={confirmed} disabled={locked} onValueChange={setConfirmed}/><AdminText>I understand the backup can return listings to draft and temporarily hide matching reviews.</AdminText></View>}
  {error&&<AdminText>{error}</AdminText>}
  <AppButton label={uncertain?'Retry same settings':'Save backup settings'} loading={busy} disabled={busy||reason.trim().length<10||(mode==='enabled'&&!confirmed)} onPress={()=>void save()}/>
 </View>;
}
