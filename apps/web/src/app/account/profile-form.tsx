'use client';

import { useActionState } from 'react';
import { usRegionOptions } from '@sds/validation';

import { type ProfileFormState, updateProfileAction } from './actions';

interface ProfileFormProps {
  readonly profile: {
    readonly display_name: string | null;
    readonly city: string | null;
    readonly region_code: string | null;
    readonly postal_code: string | null;
  };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  );
  const errors = state.errors ? Object.values(state.errors).flat() : [];

  return (
    <form action={action} className="form-stack">
      <label>
        Display name
        <input
          name="displayName"
          defaultValue={profile.display_name ?? ''}
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      <div className="form-row">
        <label>
          City
          <input name="city" defaultValue={profile.city ?? ''} maxLength={100} />
        </label>
        <label>
          State
          <select name="regionCode" defaultValue={profile.region_code ?? ''}>
            <option value="">Select a state</option>
            {usRegionOptions.map(([code, name]) => (
              <option value={code} key={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Postal code
          <input
            name="postalCode"
            defaultValue={profile.postal_code ?? ''}
            inputMode="numeric"
            pattern="\d{5}(-\d{4})?"
            maxLength={10}
          />
        </label>
      </div>
      <div aria-live="polite" className={state.success ? 'form-success' : 'form-error'}>
        {state.success ?? state.message ?? errors[0]}
      </div>
      <button className="button" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
