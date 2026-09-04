import { ECHO_GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../config/clientConfig.js';

export type Availability = 'unknown' | 'checking' | 'ready' | 'unavailable';
/** Advisory only: room transport must never await this probe. */
export class ServerAvailabilityService {
  status: Availability = 'unknown';
  lastOutcome: 'unknown' | 'response' | 'non_ok' | 'timeout' | 'network' | 'cancelled' = 'unknown';
  #pending: Promise<Availability> | null = null;
  #controller: AbortController | null = null;
  #interval: ReturnType<typeof setInterval> | null = null;
  #listeners = new Set<(state: Availability) => void>();
  #request = 0;
  constructor(
    readonly url: string,
    readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  subscribe(listener: (state: Availability) => void): () => void {
    this.#listeners.add(listener);
    listener(this.status);
    return () => this.#listeners.delete(listener);
  }

  start(): void {
    if (this.#interval !== null) return;
    void this.probe();
    this.#interval = setInterval(() => {
      void this.probe();
    }, ECHO_GAMEPLAY_CONFIG.landingKeepaliveMs);
    document.addEventListener('visibilitychange', this.#visibility);
  }

  stop(): void {
    if (this.#interval !== null) clearInterval(this.#interval);
    this.#interval = null;
    document.removeEventListener('visibilitychange', this.#visibility);
    this.#controller?.abort();
  }

  probe(): Promise<Availability> {
    if (this.#pending) return this.#pending;
    const controller = (this.#controller = new AbortController());
    const requestId = ++this.#request;
    const startedAt = performance.now();
    this.#setStatus('checking');
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 5_000);
    this.#pending = Promise.resolve()
      .then(() =>
        this.fetcher(`${this.url}/healthz`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        }),
      )
      .then(
        (response): Availability => {
          this.lastOutcome = response.ok ? 'response' : 'non_ok';
          return response.ok ? 'ready' : 'unavailable';
        },
        (): Availability => {
          this.lastOutcome = timedOut
            ? 'timeout'
            : controller.signal.aborted
              ? 'cancelled'
              : 'network';
          return 'unavailable';
        },
      )
      .then((status) => {
        this.#setStatus(status);
        console.info('[availability]', {
          requestId,
          status,
          outcome: this.lastOutcome,
          durationMs: Math.round(performance.now() - startedAt),
        });
        return status;
      })
      .finally(() => {
        clearTimeout(timeout);
        this.#pending = null;
        this.#controller = null;
      });
    return this.#pending;
  }

  readonly #visibility = (): void => {
    console.info('[availability]', { stage: 'visibility', hidden: document.hidden });
    if (!document.hidden) void this.probe();
  };
  #setStatus(status: Availability): void {
    this.status = status;
    this.#listeners.forEach((listener) => listener(status));
  }
}

export const serverAvailability = new ServerAvailabilityService(CLIENT_CONFIG.serverHttpUrl);
