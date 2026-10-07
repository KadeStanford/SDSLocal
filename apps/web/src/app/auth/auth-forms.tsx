'use client';
import { SurfacePanel, ActionButton } from '@/components/shared-ui';

import { useActionState, useState } from 'react';

import {
  appleSignInAction,
  type AuthFormState,
  googleSignInAction,
  magicLinkAction,
  signInAction,
  signUpAction,
} from './actions';

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
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [signInState, signIn, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initialState);
  const [magicState, magicLink, magicPending] = useActionState(magicLinkAction, initialState);
  const [appleState, appleSignIn, applePending] = useActionState(appleSignInAction, initialState);
  const [googleState, googleSignIn, googlePending] = useActionState(
    googleSignInAction,
    initialState,
  );

  return (
    <div className="account-auth">
      <div className="account-auth-tabs" role="tablist" aria-label="Account access">
        {(['signin', 'signup'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`auth-tab-${value}`}
            aria-controls={`auth-panel-${value}`}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            disabled={
              signInPending || signUpPending || magicPending || applePending || googlePending
            }
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const nextTab =
                event.key === 'Home'
                  ? 'signin'
                  : event.key === 'End'
                    ? 'signup'
                    : value === 'signin'
                      ? 'signup'
                      : 'signin';
              setTab(nextTab);
              document.getElementById(`auth-tab-${nextTab}`)?.focus();
            }}
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <SurfacePanel
        id="auth-panel-signin"
        role="tabpanel"
        aria-labelledby="auth-tab-signin"
        hidden={tab !== 'signin'}
      >
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
          <ActionButton disabled={signInPending} type="submit">
            {signInPending ? 'Signing in…' : 'Sign in'}
          </ActionButton>
        </form>

        <div className="divider">or</div>
        <form action={appleSignIn} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <Feedback state={appleState} />
          <ActionButton className="button-secondary" disabled={applePending} type="submit">
            {applePending ? 'Connecting…' : 'Continue with Apple'}
          </ActionButton>
        </form>
        <form action={googleSignIn} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <Feedback state={googleState} />
          <ActionButton className="button-secondary" disabled={googlePending} type="submit">
            {googlePending ? 'Connecting…' : 'Continue with Google'}
          </ActionButton>
        </form>
        <details className="account-auth-magic">
          <summary>Email me a sign-in link</summary>
          <form action={magicLink} className="form-stack">
            <input type="hidden" name="next" value={next} />
            <label>
              Email for a magic link
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <Feedback state={magicState} />
            <ActionButton className="button-secondary" disabled={magicPending} type="submit">
              {magicPending ? 'Sending…' : 'Email me a sign-in link'}
            </ActionButton>
          </form>
        </details>
        {process.env.NODE_ENV === 'development' && (
          <a className="local-inbox-link" href="http://127.0.0.1:54324" target="_blank">
            Open the local development inbox
          </a>
        )}
      </SurfacePanel>

      <SurfacePanel
        id="auth-panel-signup"
        role="tabpanel"
        aria-labelledby="auth-tab-signup"
        hidden={tab !== 'signup'}
      >
        <p className="eyebrow">New to Parish Pass</p>
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
            <span className="field-hint">
              Email sign-in passwords need 10+ characters with upper/lowercase and a number.
            </span>
          </label>
          <Feedback state={signUpState} />
          <ActionButton disabled={signUpPending} type="submit">
            {signUpPending ? 'Creating account…' : 'Create account'}
          </ActionButton>
        </form>
        <div className="divider">or</div>
        <form action={appleSignIn} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <Feedback state={appleState} />
          <ActionButton className="button-secondary" disabled={applePending} type="submit">
            {applePending ? 'Connecting…' : 'Create account with Apple'}
          </ActionButton>
        </form>
        <form action={googleSignIn} className="form-stack">
          <input type="hidden" name="next" value={next} />
          <Feedback state={googleState} />
          <ActionButton className="button-secondary" disabled={googlePending} type="submit">
            {googlePending ? 'Connecting…' : 'Create account with Google'}
          </ActionButton>
        </form>
      </SurfacePanel>
    </div>
  );
}
