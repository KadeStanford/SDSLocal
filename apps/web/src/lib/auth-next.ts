/** Preserve an internal post-auth path without allowing URL parser host escapes. */
export function safeAuthNext(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return '/account';
  const base = 'https://parish-pass.invalid';
  try {
    const destination = new URL(value, base);
    return destination.origin === base
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : '/account';
  } catch {
    return '/account';
  }
}
