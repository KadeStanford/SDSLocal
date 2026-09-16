import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

const redirectTo = 'sdslocal://auth/callback';

WebBrowser.maybeCompleteAuthSession();

function callbackParameters(url: string) {
  const parsed = new URL(url);
  const parameters = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  new URLSearchParams(fragment).forEach((value, key) => parameters.set(key, value));
  return parameters;
}

async function completeOAuth(url: string, flowId?: string | null) {
  const parameters = callbackParameters(url);
  const description = parameters.get('error_description');
  if (description) throw new Error(description);

  const code = parameters.get('code');
  if (code) {
    const response = flowId
      ? await supabase.auth.exchangeCodeForSession(code, { flowId })
      : await supabase.auth.exchangeCodeForSession(code);
    if (response.error) throw response.error;
    return;
  }

  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }
}

async function openOAuth(url: string, flowId?: string | null) {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo, {
    preferEphemeralSession: false,
  });
  if (result.type !== 'success') return false;
  await completeOAuth(result.url, flowId);
  return true;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in is unavailable.');
  return openOAuth(data.url, data.flowId);
}

export async function linkGoogleIdentity() {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google account linking is unavailable.');
  const completed = await openOAuth(data.url, data.flowId);
  if (!completed) return false;

  const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
  if (identitiesError) throw identitiesError;
  return identities.identities.some((identity) => identity.provider === 'google');
}
