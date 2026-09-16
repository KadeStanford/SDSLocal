'use server';

import { customerProfileSchema } from '@sds/validation';

import { createClient } from '@/lib/supabase/server';

export interface ProfileFormState {
  readonly message?: string;
  readonly success?: string;
  readonly errors?: Record<string, string[]>;
}

export async function updateProfileAction(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = customerProfileSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { message: 'Please sign in again.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: result.data.displayName,
      city: result.data.city ?? null,
      region_code: result.data.regionCode ?? null,
      postal_code: result.data.postalCode ?? null,
    })
    .eq('id', authData.user.id);

  if (error) return { message: error.message };
  return { success: 'Profile saved.' };
}
