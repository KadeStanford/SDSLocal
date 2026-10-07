import Link from 'next/link';
export function OpenInApp({ path, description }: { path: string; description: string }) {
  return (
    <section className="panel open-in-app" aria-label="Continue in Parish Pass">
      <div>
        <h2>Open this in Parish Pass</h2>
        <p>{description}</p>
      </div>
      <a className="button" href={`sdslocal://${path.replace(/^\//, '')}`}>
        Open Parish Pass
      </a>
      <details className="open-in-app-help">
        <summary>About app links</summary>
        <p className="field-hint">
          Already installed? This opens the same place in the app. You can keep browsing this page
          without it.
        </p>
        <Link className="open-in-app-browse" href="/explore">
          Keep browsing businesses
        </Link>
      </details>
    </section>
  );
}
