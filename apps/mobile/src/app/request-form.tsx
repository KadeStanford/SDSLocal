import { PageHeader } from '@/components/page-header';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BusinessFeatureGate } from '@/components/business-feature-gate';
import { Alert, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MerchantButton, MerchantHeading, merchantStyles } from '@/components/merchant-ui';
import { RequestFormBuilder } from '@/components/request-form-builder';
import { ListLoading, StateNotice } from '@/components/data-state';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { supabase } from '@/lib/supabase';
import { requestFormError, type RequestField } from '@/lib/service-request-schema';
import { useAuth } from '@/providers/auth-provider';

export default function RequestFormScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const { session } = useAuth();
  return <Editor key={`${session?.user.id}:${businessId}`} businessId={businessId} />;
}
function Editor({ businessId }: { businessId: string }) {
  const { session } = useAuth();
  const c = useMerchantTheme(),
    bottom = useScreenBottomPadding(),
    nav = useNavigation();
  const pending = useRef(false);
  const [fields, setFields] = useState<RequestField[]>([]),
    [saved, setSaved] = useState(''),
    [revision, setRevision] = useState(0),
    [name, setName] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const dirty = !!saved && JSON.stringify(fields) !== saved;
  usePreventRemove(dirty || busy, ({ data }) => {
    if (busy) return;
    Alert.alert('Discard form changes?', 'Your published form will stay unchanged.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => nav.dispatch(data.action) },
    ]);
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!session?.user.id || !businessId) throw new Error('Owner access required');
      const membership = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (membership.error || membership.data?.role !== 'owner') {
        setSaved('');
        setError('Only a business owner can customize its request form.');
        return;
      }
      const [form, business] = await Promise.all([
        supabase
          .from('service_request_forms')
          .select('revision,fields')
          .eq('business_id', businessId)
          .maybeSingle(),
        supabase.from('businesses').select('name').eq('id', businessId).single(),
      ]);
      if (form.error || business.error) throw form.error ?? business.error;
      const next = (form.data?.fields ?? []) as RequestField[];
      setFields(next);
      setSaved(JSON.stringify(next));
      setRevision(form.data?.revision ?? 0);
      setName(business.data.name);
    } catch {
      setError('The request form could not load. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [businessId, session]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  async function save() {
    if (pending.current) return;
    const validation = requestFormError(fields);
    if (validation) {
      setError(validation);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const cleaned = fields.map((f) => ({
      ...f,
      label: f.label.trim(),
      options: f.type === 'choice' ? f.options.map((o) => o.trim()) : [],
    }));
    try {
      const result = await supabase.rpc('save_service_request_form', {
        p_business_id: businessId,
        p_revision: revision,
        p_fields: cleaned,
      });
      if (result.error) throw result.error;
      setRevision(result.data);
      setFields(cleaned);
      setSaved(JSON.stringify(cleaned));
      setNotice('Request form saved. Customers will see these questions.');
    } catch (e) {
      setError(
        (e as { code?: string })?.code === '40001'
          ? 'Another owner changed this form. Your draft is retained. Go back and reload before trying again.'
          : 'The form could not be saved. Your changes are retained.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[merchantStyles.content, { paddingBottom: bottom }]}
      >
        <PageHeader onBack={() => router.back()} backLabel="Back to requests" backDisabled={busy} />
        <MerchantHeading
          title="Request form"
          subtitle={name || 'Questions for estimates and service requests'}
        />
        {!!error && <StateNotice kind="error" message={error} />}
        {!!notice && <StateNotice kind="success" message={notice} />}
        {loading ? (
          <ListLoading label="Loading request form" />
        ) : saved ? (
          <>
            <BusinessFeatureGate businessId={businessId} operation="edit_request_form">
              <RequestFormBuilder fields={fields} onChange={setFields} disabled={busy} />
              <MerchantButton
                brand
                label={dirty ? 'Save request form' : 'Form up to date'}
                loading={busy}
                disabled={!dirty}
                onPress={() => void save()}
              />
            </BusinessFeatureGate>
          </>
        ) : (
          <MerchantButton brand label="Retry loading" onPress={() => void load()} />
        )}
        <View></View>
      </ScrollView>
    </SafeAreaView>
  );
}
