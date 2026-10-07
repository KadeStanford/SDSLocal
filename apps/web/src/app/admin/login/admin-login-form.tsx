'use client';
import {useActionState} from 'react';
import {signInAction,type AuthFormState} from '@/app/auth/actions';
export function AdminLoginForm() {
  const [state,action,pending]=useActionState(signInAction,{} as AuthFormState);
  const error=state.message??Object.values(state.errors??{}).flat()[0];
  return <form action={action} className="form-stack">
    <input type="hidden" name="next" value="/admin" />
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button" type="submit" disabled={pending}>{pending?'Signing in…':'Sign in to admin'}</button>
  </form>;
}
