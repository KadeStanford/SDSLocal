'use server';

import { magicLinkSchema, signInSchema, signUpSchema } from '@sds/validation';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSiteUrl } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export interface AuthFormState {
  readonly errors?: Record<string, string[]>;
  readonly message?: string;
  readonly success?: string;
}

function formErrors(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(([, messages]) => messages?.length),
  ) as Record<string, string[]>;
  return { errors: fieldErrors } satisfies AuthFormState;
}

function safeNext(formData: FormData) {
  const value = String(formData.get('next') ?? '/account');
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

/**
 * Keep OAuth callbacks on the origin that submitted the form. This matters in
 * local Docker development because the host can be opened as either localhost
 * or the LAN address; switching origins would drop the PKCE cookie.
 */
async function getAuthRedirectBaseUrl() {
  const configured = new URL(getSiteUrl());
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = (forwardedHost ?? requestHeaders.get('host') ?? '').split(',')[0]?.trim();
  if (!host) return configured.origin;

  const hostname = host.replace(/^\[/, '').replace(/\]$/, '').split(':')[0]?.toLowerCase();
  const allowedHostnames = new Set([
    configured.hostname.toLowerCase(),
    'localhost',
    '127.0.0.1',
    process.env.EXPO_HOST_IP?.toLowerCase(),
  ]);
  if (!hostname || !allowedHostnames.has(hostname)) return configured.origin;

  const forwardedProto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol =
    forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : configured.protocol.replace(':', '');
  return `${protocol}://${host}`;
}

async function getAuthRedirectUrl(next: string) {
  const baseUrl = await getAuthRedirectBaseUrl();
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = signInSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return formErrors(result.error);
  const next = safeNext(formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) return { message: 'The email or password was not recognized.' };

  redirect(next);
}

export async function signUpAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeNext(formData);
  const displayName = String(formData.get('displayName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (displayName.length < 2) {
    return { errors: { displayName: ['Enter a display name with at least 2 characters.'] } };
  }

  const result = signUpSchema.safeParse({
    displayName,
    email,
    password: formData.get('password'),
  });
  if (!result.success) return formErrors(result.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { display_name: result.data.displayName },
      emailRedirectTo: await getAuthRedirectUrl(next),
    },
  });

  if (error) return { message: error.message };
  if (data.session) redirect(next);

  return { success: 'Check your email to finish creating your account.' };
}

export async function magicLinkAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = magicLinkSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return formErrors(result.error);
  const next = safeNext(formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: {
      emailRedirectTo: await getAuthRedirectUrl(next),
      shouldCreateUser: false,
    },
  });

  if (error) return { message: error.message };
  return { success: 'A secure sign-in link is on its way.' };
}

/** Start the browser Sign in with Apple flow for both sign-in and sign-up. */
export async function appleSignInAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeNext(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: await getAuthRedirectUrl(next),
    },
  });
  if (error) return { message: 'Apple sign-in is not configured yet. Please use email sign-in.' };
  if (!data.url) return { message: 'Apple sign-in could not be started. Please try again.' };
  redirect(data.url);
}

/** Start the browser Google OAuth flow for both sign-in and sign-up. */
export async function googleSignInAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeNext(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: await getAuthRedirectUrl(next),
    },
  });
  if (error) return { message: 'Google sign-in is not configured yet. Please use email sign-in.' };
  if (!data.url) return { message: 'Google sign-in could not be started. Please try again.' };
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
