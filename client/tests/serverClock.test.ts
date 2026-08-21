import { beforeEach, describe, expect, it } from 'vitest';
import { serverClock } from '../src/network/serverClock.js';

describe('serverClock', () => {
  beforeEach(() => serverClock.reset());

  it('uses the session timestamp to align client rendering with server time', () => {
    serverClock.synchronize(10_250, 10_000);
    expect(serverClock.now(10_500)).toBe(10_750);
  });
});
