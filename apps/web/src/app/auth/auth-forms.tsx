'use client';

import { useActionState } from 'react';

import { type AuthFormState, magicLinkAction, signInAction, signUpAction } from './actions';

const initialState: AuthFormState = {};

function Feedback({ state }: { readonly state: AuthFormState }) {
  const errors = state.errors ? Object.values(state.errors).flat() : [];
  if (!state.message && !state.success && errors.length === 0) return null;

  return (
    <div aria-live="polite" className={state.success ? 'form-success' : 'form-error'}>
      {state.success ?? state.message ?? errors[0]}
    </div>
  );
}

export function AuthForms({ next = '/account' }: { readonly next?: string }) {
  const [signInState, signIn, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initialState);
  const [magicState, magicLink, magicPending] = useActionState(magicLinkAction, initialState);

  return (
    <div className="auth-grid">
      <section className="panel">
        <p className="eyebrow">Welcome back</p>
        <h2>Sign in</h2>
        <form action={signIn} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <Feedback state={signInState} />
          <button className="button" disabled={signInPending}>
            {signInPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="divider">or</div>
        <form action={magicLink} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <label>
            Email for a magic link
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <Feedback state={magicState} />
          <button className="button button-secondary" disabled={magicPending}>
            {magicPending ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
        {process.env.NODE_ENV === 'development' && (
          <a className="local-inbox-link" href="http://127.0.0.1:54324" target="_blank">
            Open the local development inbox
          </a>
        )}
      </section>

      <section className="panel panel-accent">
        <p className="eyebrow">New to SDS Local</p>
        <h2>Create an account</h2>
        <form action={signUp} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <label>
            Display name
            <input name="displayName" autoComplete="name" minLength={2} maxLength={100} required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <span className="field-hint">10+ characters with upper/lowercase and a number.</span>
          </label>
          <Feedback state={signUpState} />
          <button className="button" disabled={signUpPending}>
            {signUpPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </section>
    </div>
  );
}
