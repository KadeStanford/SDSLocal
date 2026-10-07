import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { MerchantButton } from './merchant-ui';
export function PendingEmailConfirmation({
  email,
  onChangeEmail,
}: {
  email: string;
  onChangeEmail: () => void;
}) {
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [until, setUntil] = useState(() =>
    Number(globalThis.localStorage.getItem('parish:confirmation-resend-after') ?? 0),
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  async function resend() {
    if (busy || seconds) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await supabase.auth.resend({ type: 'signup', email });
      if (result.error) throw result.error;
      const next = Date.now() + 60000;
      setUntil(next);
      globalThis.localStorage.setItem('parish:confirmation-resend-after', String(next));
      setNotice('Confirmation requested. Check your inbox and spam folder for the newest link.');
    } catch {
      setNotice('We couldn’t resend right now. Please wait a moment and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 20 }}>
      <ThemedText type="title">Check your email</ThemedText>
      <View
        style={{ padding: 18, borderRadius: 16, backgroundColor: c.backgroundElement, gap: 10 }}
      >
        <ThemedText type="smallBold">{email}</ThemedText>
        <ThemedText themeColor="textSecondary">
          Open the confirmation link to finish creating your account. Your next step will be waiting
          when you return.
        </ThemedText>
      </View>
      <MerchantButton
        label="I’ve confirmed my email"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void supabase.auth
            .getSession()
            .then(({ data }) => {
              if (!data.session)
                setNotice(
                  'If you confirmed on another device, return to sign in here. Otherwise open the newest link in your email.',
                );
            })
            .catch(() => setNotice('We couldn’t check your sign-in. Please retry.'))
            .finally(() => setBusy(false));
        }}
      />
      <MerchantButton
        label={seconds ? `Resend in ${seconds}s` : 'Resend confirmation'}
        secondary
        disabled={busy || seconds > 0}
        onPress={() => void resend()}
      />
      <MerchantButton
        label="Change email or return to sign in"
        secondary
        disabled={busy}
        onPress={onChangeEmail}
      />
      {!!notice && <ThemedText accessibilityLiveRegion="polite">{notice}</ThemedText>}
    </View>
  );
}
