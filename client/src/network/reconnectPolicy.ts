type Delay = (delayMs: number) => Promise<void>;

const RESERVATION_PENDING_MESSAGE = 'reconnection token invalid or expired';
const RETRY_DELAYS_MS = [200, 400, 800, 1_200, 1_600] as const;

function isReservationPending(error: unknown): boolean {
  return (
    error instanceof Error && error.message.toLowerCase().includes(RESERVATION_PENDING_MESSAGE)
  );
}

const wait: Delay = (delayMs) => new Promise((resolve) => window.setTimeout(resolve, delayMs));

export async function reconnectWithSessionFallback<T>(
  reconnect: () => Promise<T>,
  resumeSession: () => Promise<T>,
  delay: Delay = wait,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await reconnect();
    } catch (error) {
      const retryDelayMs = RETRY_DELAYS_MS[attempt];
      if (!isReservationPending(error)) throw error;
      if (retryDelayMs === undefined) return resumeSession();
      await delay(retryDelayMs);
    }
  }
}
