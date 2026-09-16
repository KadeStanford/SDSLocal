'use server';

import { magicLinkSchema, signInSchema, signUpSchema } from '@sds/validation';
import { redirect } from 'next/navigation';

import { getSiteUrl } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export interface AuthFormState {
  readonly errors?: Record<string, string[]>;
  readonly message?: string;
  readonly success?: string;
}

function formErrors(error: { flatten(): { fieldErrors: Record<string, string[]> } }) {
  return { errors: error.flatten().fieldErrors } satisfies AuthFormState;
}

function safeNext(formData: FormData) {
  const value = String(formData.get('next') ?? '/account');
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account';
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
  const result = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return formErrors(result.error);
  const next = safeNext(formData);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { display_name: result.data.displayName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
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
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: false,
    },
  });

  if (error) return { message: error.message };
  return { success: 'A secure sign-in link is on its way.' };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
