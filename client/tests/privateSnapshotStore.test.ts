import { beforeEach, describe, expect, it } from 'vitest';
import { privateSnapshotStore } from '../src/state/privateSnapshotStore.js';

describe('privateSnapshotStore', () => {
  beforeEach(() => privateSnapshotStore.getState().reset());

  it('should store detection snapshots locally and expire them by server time', () => {
    privateSnapshotStore.getState().addDetection({
      type: 'private_sonar',
      snapshotId: 'scan-1',
      detectedPlayerId: 'opponent',
      position: { x: 120, y: 80 },
      detectedAtServerMs: 1_000,
      expiresAtServerMs: 2_250,
      sweepAngleRad: 0.5,
    });
    expect(privateSnapshotStore.getState().detections).toHaveLength(1);
    privateSnapshotStore.getState().prune(2_251);
    expect(privateSnapshotStore.getState().detections).toHaveLength(0);
  });

  it('ignores stale private movement snapshots', () => {
    const newer = {
      type: 'private_state' as const,
      playerId: 'player-1',
      position: { x: 80, y: 90 },
      velocity: { x: 0, y: 0 },
      aimAngleRad: 1,
      serverTimeMs: 2_000,
      sequence: 4,
    };
    privateSnapshotStore.getState().applyPlayerState(newer);
    privateSnapshotStore.getState().applyPlayerState({
      ...newer,
      position: { x: 10, y: 20 },
      serverTimeMs: 1_000,
      sequence: 3,
    });
    expect(privateSnapshotStore.getState().playerState?.position).toEqual({ x: 80, y: 90 });
  });
});
