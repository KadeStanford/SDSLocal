/** Uses the same existing Parish Pass emblem as the native app. */
export function BrandWordmark({ business = false }: { business?: boolean }) {
  return <span className="brand-wordmark"><img src="/brand/mark.svg" width="28" height="28" alt="" /><span className="brand-wordmark-copy"><span>parish pass</span>{business && <small>FOR BUSINESS</small>}</span></span>;
}
