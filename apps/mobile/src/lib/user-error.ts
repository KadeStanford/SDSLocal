interface ErrorIssue {
  readonly message?: unknown;
}

interface ErrorDetails {
  readonly code?: unknown;
  readonly error_code?: unknown;
  readonly issues?: unknown;
  readonly message?: unknown;
}

function errorDetails(error: unknown): ErrorDetails {
  return error && typeof error === 'object' ? (error as ErrorDetails) : {};
}

export function userMessageFromError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
  provider?: 'Google' | 'Apple',
) {
  const details = errorDetails(error);
  if (Array.isArray(details.issues)) {
    const firstIssue = details.issues.find(
      (issue): issue is ErrorIssue =>
        Boolean(issue) &&
        typeof issue === 'object' &&
        typeof (issue as ErrorIssue).message === 'string',
    );
    if (typeof firstIssue?.message === 'string') return firstIssue.message;
  }

  const raw = [details.code, details.error_code, details.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  if (
    typeof details.message === 'string' &&
    (details.message.startsWith('Add an email address') ||
      details.message.startsWith('Enter a display name'))
  ) {
    return details.message;
  }

  if (raw.includes('invalid login credentials')) {
    return 'That email and password do not match. Check them and try again.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (
    raw.includes('user already registered') ||
    raw.includes('already been registered') ||
    raw.includes('user_already_exists')
  ) {
    return 'An account already exists for this email. Sign in or reset your password instead.';
  }
  if (
    raw.includes('over_email_send_rate_limit') ||
    raw.includes('rate limit') ||
    raw.includes('only request this after')
  ) {
    return 'Please wait about a minute before requesting another email.';
  }
  if (
    raw.includes('provider is not enabled') ||
    raw.includes('provider_disabled') ||
    raw.includes('unsupported provider')
  ) {
    if (provider === 'Apple') {
      return 'Apple sign-in is not enabled for this staging environment yet.';
    }
    return provider
      ? `${provider} sign-in is temporarily unavailable. Please use email sign-in for now.`
      : 'This sign-in option is temporarily unavailable. Please use email sign-in for now.';
  }
  if (provider === 'Google' && raw.includes('google sign-in needs')) {
    return typeof details.message === 'string'
      ? details.message
      : 'Google sign-in needs native build configuration.';
  }
  if (provider === 'Google' && raw.includes('developer_error')) {
    return 'Google sign-in is not matched to this app build. Check the iOS URL scheme and Android signing certificate in Google Cloud.';
  }
  if (raw.includes('manual linking') || raw.includes('manual_linking')) {
    if (provider === 'Apple') {
      return 'Apple account linking is disabled on the Auth server. Enable manual identity linking in Supabase Auth settings.';
    }
    return 'Account linking is disabled on this server. Enable manual identity linking in Supabase Auth settings.';
  }
  if (raw.includes('identity_already_exists')) {
    return provider
      ? `That ${provider} account is already linked to another SDS Local account.`
      : 'That account is already linked to another SDS Local account.';
  }
  if (raw.includes('jwt') && raw.includes('expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (raw.includes('otp_expired') || raw.includes('expired')) {
    return 'That reset code has expired. Request a new code and try again.';
  }
  if (
    raw.includes('invalid otp') ||
    raw.includes('token is invalid') ||
    raw.includes('invalid token') ||
    raw.includes('otp_disabled')
  ) {
    return 'That reset code is not valid. Check all six digits or request a new code.';
  }
  if (raw.includes('same_password') || raw.includes('different from the old password')) {
    return 'Choose a password you have not used before.';
  }
  if (
    raw.includes('network request failed') ||
    raw.includes('failed to fetch') ||
    raw.includes('network error')
  ) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (raw.includes('permission denied') || raw.includes('row-level security')) {
    return 'You do not have permission to make that change.';
  }
  if (raw.includes('choose a listing plan') || raw.includes('active listing plan is required')) {
    return 'Choose an active listing plan before submitting this business.';
  }
  if (raw.includes('no open business slots')) {
    return 'Every listing slot on your current plan is already assigned. Choose Multi or use an existing slot.';
  }
  if (raw.includes('assigned to another owner billing account')) {
    return 'This business is already covered by another owner’s listing plan.';
  }

  return fallback;
}
