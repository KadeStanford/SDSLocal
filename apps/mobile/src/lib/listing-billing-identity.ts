export interface BillingIdentityConfiguration {
  readonly apiKey: string;
  readonly appUserID: string;
}

export interface BillingIdentityClient {
  readonly isConfigured: () => Promise<boolean>;
  readonly configure: (configuration: BillingIdentityConfiguration) => void;
  readonly logIn: (appUserID: string) => Promise<unknown>;
  readonly logOut: () => Promise<unknown>;
}

export interface BillingIdentityRequest {
  readonly generation: number;
  readonly userId: string | null;
  readonly enabled: boolean;
  readonly ready: Promise<boolean>;
}

type CoordinatorStatus = 'idle' | 'transitioning' | 'ready' | 'unavailable' | 'error';

/**
 * Serializes the native billing SDK's identity lifecycle.
 *
 * RevenueCat identity methods are asynchronous, but the native client has one
 * mutable current customer. A generation check alone is not enough: an older
 * native call can still finish after a newer request starts. This coordinator
 * queues those calls and makes every continuation re-check the active request.
 */
export class ListingBillingIdentityCoordinator {
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private currentRequest: BillingIdentityRequest | null = null;
  private activeIdentity: string | null = null;
  private status: CoordinatorStatus = 'idle';

  public constructor(
    private readonly loadClient: () => Promise<BillingIdentityClient>,
    private readonly apiKey: string,
  ) {}

  public request(userId: string | null, enabled = true): BillingIdentityRequest {
    const request: {
      readonly generation: number;
      readonly userId: string | null;
      readonly enabled: boolean;
      ready: Promise<boolean>;
    } = {
      generation: ++this.generation,
      userId,
      enabled,
      ready: Promise.resolve(false),
    };

    this.currentRequest = request;
    this.status = enabled ? 'transitioning' : 'unavailable';

    const transition = this.enqueue(async () => {
      if (!enabled) return false;

      try {
        const client = await this.loadClient();
        if (!this.isCurrent(request)) return false;

        const isConfigured = await client.isConfigured();
        if (!this.isCurrent(request)) return false;

        if (!isConfigured) {
          if (!userId) {
            this.activeIdentity = null;
            this.status = 'idle';
            return true;
          }
          client.configure({ apiKey: this.apiKey, appUserID: userId });
          // configure is synchronous, so remember the native identity even
          // when this request becomes stale immediately afterwards.
          this.activeIdentity = userId;
        } else if (!userId) {
          await client.logOut();
          this.activeIdentity = null;
          if (!this.isCurrent(request)) return false;
        } else if (this.activeIdentity !== userId) {
          await client.logIn(userId);
          // A stale logIn still changed the native SDK identity. Recording
          // it forces the next current request to repair that identity.
          this.activeIdentity = userId;
          if (!this.isCurrent(request)) return false;
        }

        if (!this.isCurrent(request)) return false;
        this.activeIdentity = userId;
        this.status = userId ? 'ready' : 'idle';
        return true;
      } catch {
        if (this.isCurrent(request)) this.status = 'error';
        return false;
      }
    });

    request.ready = transition.then((completed) => completed && this.isCurrent(request));
    return request;
  }

  public isCurrent(request: BillingIdentityRequest): boolean {
    return this.currentRequest?.generation === request.generation;
  }

  public isReadyFor(request: BillingIdentityRequest): boolean {
    return (
      request.enabled &&
      this.isCurrent(request) &&
      this.status === 'ready' &&
      this.activeIdentity === request.userId &&
      request.userId !== null
    );
  }

  public commitIfCurrent(request: BillingIdentityRequest, commit: () => void): boolean {
    if (!this.isCurrent(request)) return false;
    commit();
    return true;
  }

  /** Run SDK work only after this request owns the serialized SDK lane. */
  public runSdkFor<T>(
    request: BillingIdentityRequest,
    operation: () => Promise<T>,
  ): Promise<T | undefined> {
    return this.enqueue(async () => {
      if (!this.isReadyFor(request)) return undefined;
      const result = await operation();
      return this.isCurrent(request) ? result : undefined;
    });
  }

  /**
   * A checkout helper that refuses to queue a purchase behind an identity
   * transition. The user must press checkout again once the account is ready.
   */
  public runIfReady<T>(
    request: BillingIdentityRequest,
    operation: () => Promise<T>,
  ): Promise<T | undefined> {
    if (!this.isReadyFor(request)) return Promise.resolve(undefined);
    return this.runSdkFor(request, operation);
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}
