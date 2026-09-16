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
  if (raw.includes('provider is not enabled') || raw.includes('unsupported provider')) {
    return 'Google sign-in is temporarily unavailable. Please use email sign-in for now.';
  }
  if (raw.includes('identity_already_exists')) {
    return 'That Google account is already linked to another SDS Local account.';
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

  return fallback;
}
