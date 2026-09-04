import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerAvailabilityService } from '../src/network/ServerAvailabilityService.js';
import { InvisiFightClient } from '../src/network/colyseusClient.js';
import { connectionStore } from '../src/state/connectionStore.js';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('colyseus.js', () => ({
  Client: class {
    create = create;
  },
}));

describe('transport is independent of health', () => {
  beforeEach(() => {
    create.mockReset();
  });
  it('allows a new intent after cancellation and discards the late previous transport', async () => {
    const makeRoom = () => ({
      onStateChange: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onLeave: vi.fn(),
      send: vi.fn(),
      leave: vi.fn(),
    });
    const oldRoom = makeRoom();
    const nextRoom = makeRoom();
    let finishOld!: (room: typeof oldRoom) => void;
    let finishNext!: (room: typeof nextRoom) => void;
    create
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishNext = resolve;
          }),
      );
    const client = new InvisiFightClient();
    const oldIntent = client.createRoom('Old');
    await client.leave();
    const nextIntent = client.createRoom('Next');
    expect(create).toHaveBeenCalledTimes(2);
    finishOld(oldRoom);
    await oldIntent;
    const duplicate = client.createRoom('Next');
    expect(create).toHaveBeenCalledTimes(2);
    finishNext(nextRoom);
    await Promise.all([nextIntent, duplicate]);
    expect(oldRoom.leave).toHaveBeenCalledWith(true);
    expect(client.room).toBe(nextRoom);
    await client.leave();
  });
  it('opens one room after a failed health probe, even with duplicate submissions', async () => {
    const availability = new ServerAvailabilityService(
      'https://server.example',
      vi.fn().mockRejectedValue(new TypeError('CORS')),
    );
    await availability.probe();
    const room = {
      onStateChange: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onLeave: vi.fn(),
      send: vi.fn(),
      leave: vi.fn(),
    };
    create.mockResolvedValue(room);
    const client = new InvisiFightClient();
    await Promise.all([client.createRoom('Host'), client.createRoom('Host')]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(client.room).toBe(room);
    expect(connectionStore.getState().status).toBe('connected');
    await client.leave();
  });
});
