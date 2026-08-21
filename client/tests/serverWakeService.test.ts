import { describe, expect, it, vi } from 'vitest';
import { ServerWakeError, ServerWakeService } from '../src/network/ServerWakeService.js';

describe('ServerWakeService', () => {
  it('retries a sleeping server and reports each attempt', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const delay = vi.fn(async () => undefined);
    const attempts: number[] = [];
    const service = new ServerWakeService('https://server.example', fetcher, delay);
    await service.waitUntilReady({
      maximumAttempts: 3,
      onAttempt: ({ attempt }) => attempts.push(attempt),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledTimes(1);
    expect(attempts).toEqual([1, 2]);
  });

  it('fails only after the configured retry budget is exhausted', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    const service = new ServerWakeService('https://server.example', fetcher, async () => undefined);
    await expect(service.waitUntilReady({ maximumAttempts: 2 })).rejects.toBeInstanceOf(
      ServerWakeError,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
