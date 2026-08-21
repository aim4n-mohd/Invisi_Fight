import { describe, expect, it, vi } from 'vitest';
import { reconnectWithSessionFallback } from '../src/network/reconnectPolicy.js';

describe('reconnectWithSessionFallback', () => {
  it('retries while the server is still registering the disconnected client', async () => {
    const reconnect = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('reconnection token invalid or expired.'))
      .mockResolvedValueOnce('room');
    const delay = vi.fn(async () => undefined);
    const resumeSession = vi.fn<() => Promise<string>>();

    await expect(reconnectWithSessionFallback(reconnect, resumeSession, delay)).resolves.toBe(
      'room',
    );
    expect(reconnect).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledTimes(1);
    expect(resumeSession).not.toHaveBeenCalled();
  });

  it('does not mask unrelated reconnect failures', async () => {
    const reconnect = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('offline'));
    const delay = vi.fn(async () => undefined);
    const resumeSession = vi.fn<() => Promise<string>>();

    await expect(reconnectWithSessionFallback(reconnect, resumeSession, delay)).rejects.toThrow(
      'offline',
    );
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
    expect(resumeSession).not.toHaveBeenCalled();
  });

  it('resumes with the signed room session after the transport reservation expires', async () => {
    const reconnect = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('reconnection token invalid or expired.'));
    const delay = vi.fn(async () => undefined);
    const resumeSession = vi.fn<() => Promise<string>>().mockResolvedValue('replacement-room');

    await expect(reconnectWithSessionFallback(reconnect, resumeSession, delay)).resolves.toBe(
      'replacement-room',
    );
    expect(reconnect).toHaveBeenCalledTimes(6);
    expect(delay).toHaveBeenCalledTimes(5);
    expect(resumeSession).toHaveBeenCalledTimes(1);
  });
});
