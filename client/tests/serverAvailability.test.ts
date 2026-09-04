import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServerAvailabilityService } from '../src/network/ServerAvailabilityService.js';

describe('advisory server availability', () => {
  afterEach(() => vi.useRealTimers());
  it('deduplicates probes and uses credential-free no-store GET', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
    const service = new ServerAvailabilityService('https://server.example', fetcher);
    const first = service.probe();
    expect(service.probe()).toBe(first);
    await expect(first).resolves.toBe('ready');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'https://server.example/healthz',
      expect.objectContaining({ method: 'GET', credentials: 'omit', cache: 'no-store' }),
    );
  });
  it.each(['reject', 'non-ok'])(
    'handles %s without throwing or promising transport failure',
    async (kind) => {
      const fetcher = vi.fn<typeof fetch>();
      if (kind === 'reject') fetcher.mockRejectedValue(new TypeError('Failed to fetch'));
      else fetcher.mockResolvedValue(new Response('', { status: 503 }));
      await expect(
        new ServerAvailabilityService('https://server.example', fetcher).probe(),
      ).resolves.toBe('unavailable');
    },
  );
  it('aborts a timed-out request and releases the in-flight slot', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const service = new ServerAvailabilityService('https://server.example', fetcher);
    const pending = service.probe();
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(pending).resolves.toBe('unavailable');
    fetcher.mockResolvedValue(new Response('{}'));
    await expect(service.probe()).resolves.toBe('ready');
  });
  it('owns one interval and removes visibility/interval work on stop', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
    const service = new ServerAvailabilityService('https://server.example', fetcher);
    service.start();
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(8 * 60_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(3);
    service.stop();
    await vi.advanceTimersByTimeAsync(8 * 60_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
