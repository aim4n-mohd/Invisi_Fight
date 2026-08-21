import { describe, expect, it, vi } from 'vitest';
import { reconnectWithReservationRetry } from '../src/network/reconnectPolicy.js';

describe('reconnectWithReservationRetry', () => {
  it('retries while the server is still registering the disconnected client', async () => {
    const reconnect = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('reconnection token invalid or expired.'))
      .mockResolvedValueOnce('room');
    const delay = vi.fn(async () => undefined);

    await expect(reconnectWithReservationRetry(reconnect, delay)).resolves.toBe('room');
    expect(reconnect).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledTimes(1);
  });

  it('does not mask unrelated reconnect failures', async () => {
    const reconnect = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('offline'));
    const delay = vi.fn(async () => undefined);

    await expect(reconnectWithReservationRetry(reconnect, delay)).rejects.toThrow('offline');
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });
});
