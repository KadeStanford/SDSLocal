import Link from 'next/link';
export function OpenInApp({ path, description }: { path: string; description: string }) {
  return (
    <section className="panel" aria-label="Continue in Parish Pass">
      <h2>Continue in the Parish Pass app</h2>
      <p>{description}</p>
      <a className="button" href={`sdslocal://${path.replace(/^\//, '')}`}>
        Open Parish Pass
      </a>
      <p className="field-hint">
        Already installed? This opens the same place in the app. You can keep browsing this page
        without it.
      </p>
      <Link href="/explore">Keep browsing businesses</Link>
    </section>
  );
}
