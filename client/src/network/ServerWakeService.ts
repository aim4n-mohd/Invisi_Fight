export interface WakeAttempt {
  attempt: number;
  maximumAttempts: number;
}

export interface WakeOptions {
  maximumAttempts?: number;
  requestTimeoutMs?: number;
  onAttempt?: (attempt: WakeAttempt) => void;
}

export class ServerWakeError extends Error {
  constructor() {
    super('The multiplayer server is still unavailable. Please try again in a moment.');
    this.name = 'ServerWakeError';
  }
}

type FetchLike = typeof fetch;
type Delay = (milliseconds: number) => Promise<void>;

const defaultDelay: Delay = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export class ServerWakeService {
  constructor(
    readonly serverHttpUrl: string,
    readonly fetcher: FetchLike = fetch,
    readonly delay: Delay = defaultDelay,
  ) {}

  async waitUntilReady(options: WakeOptions = {}): Promise<void> {
    const maximumAttempts = options.maximumAttempts ?? 12;
    const requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      options.onAttempt?.({ attempt, maximumAttempts });
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const fetcher = this.fetcher;
        const response = await fetcher(`${this.serverHttpUrl}/healthz`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.ok) return;
      } catch {
        // A sleeping service and a transient network failure use the same bounded retry path.
      } finally {
        window.clearTimeout(timeout);
      }
      if (attempt < maximumAttempts) await this.delay(Math.min(5_000, 500 * 2 ** (attempt - 1)));
    }
    throw new ServerWakeError();
  }
}
