import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { parseModerationOutcome, type ModerationOutcomeView } from '@sds/business-logic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { StateNotice } from './data-state';
import { FlowSection } from './flow-layout';

/** Fetch fresh ownership and current state before revealing any outcome detail or action. */
export function ModerationOutcome({ deliveryId }: { deliveryId: string }) {
  const { session } = useAuth(), { setMode } = useAppMode(), { refreshUnreadCount } = useNotifications();
  const colors = useTheme();
  const [result,setResult]=useState<ModerationOutcomeView|null>(null);
  const [loading,setLoading]=useState(true), [error,setError]=useState(false), [attempt,setAttempt]=useState(0);
  const identity=`${deliveryId}:${session?.user.id??'guest'}`;
  const [loadedIdentity,setLoadedIdentity]=useState('');
  useEffect(() => {
    let active=true;
    setResult(null);setError(false);setLoading(true);
    if(!session){setLoading(false);return;}
    void (async()=>{
      try {
        const {data,error:rpcError}=await supabase.rpc('get_my_moderation_outcome',{p_delivery_id:deliveryId});
        if(!active)return;
        if(rpcError){setError(true);return;}
        const outcome=parseModerationOutcome(data);
        setResult(outcome);
        if(outcome&&!outcome.read_at){
          await supabase.from('notification_deliveries').update({read_at:new Date().toISOString()}).eq('id',deliveryId).eq('user_id',session.user.id);
          if(active)void refreshUnreadCount();
        }
      } catch {if(active)setError(true);} finally {if(active){setLoadedIdentity(identity);setLoading(false);}}
    })();
    return()=>{active=false;};
  },[deliveryId,session?.user.id,identity,attempt,refreshUnreadCount]);
  if(!session)return <FlowSection title="Sign in to view this outcome" description="This alert belongs to the account that received it."><AppButton label="Sign in" onPress={()=>router.push('/account')}/></FlowSection>;
  if(loading||loadedIdentity!==identity)return <View accessibilityLiveRegion="polite" style={{gap:12}}><ActivityIndicator color={colors.accent}/><ThemedText themeColor="textSecondary">Checking this outcome…</ThemedText></View>;
  if(error)return <FlowSection title="Outcome unavailable" description="We could not check this alert. Try again when your connection is available."><AppButton label="Try again" onPress={()=>setAttempt(n=>n+1)}/></FlowSection>;
  if(!result)return <FlowSection title="This outcome is no longer available" description="The item may have been removed or your access may have changed."><AppButton label="Back to alerts" variant="secondary" onPress={()=>router.replace('/notification')}/></FlowSection>;
  return <View style={{gap:24}}>
    <ThemedText type="caption" themeColor="textSecondary">ACCOUNT UPDATE</ThemedText>
    <ThemedText type="title">{result.title}</ThemedText>
    <ThemedText>{result.outcome.summary}</ThemedText>
    {!result.is_latest&&<StateNotice message="This is an earlier outcome. The current status and action below reflect the latest record."/>}
    <FlowSection title="Reason for this outcome"><ThemedText>{result.outcome.public_reason}</ThemedText></FlowSection>
    <FlowSection title="What happens next"><ThemedText>{result.outcome.next_step}</ThemedText><ThemedText type="small" themeColor="textSecondary">Current status: {result.current_state.replaceAll('_',' ')}</ThemedText></FlowSection>
    {result.current_review_text!==null&&<FlowSection title="Your current review"><ThemedText>{result.current_review_text||'Star rating only. No written review.'}</ThemedText></FlowSection>}
    {result.quick_action&&<AppButton label={result.quick_action.label} onPress={()=>{
      if(result.quick_action?.app_path.startsWith('/business?'))setMode('business');
      router.push(result.quick_action!.app_path as never);
    }}/>}
    <ThemedText type="small" themeColor="textSecondary">Opening the item does not change it. Review any edits before using its save or submit control.</ThemedText>
    <ThemedText type="caption" themeColor="textSecondary">{new Date(result.created_at).toLocaleString()}</ThemedText>
  </View>;
}
