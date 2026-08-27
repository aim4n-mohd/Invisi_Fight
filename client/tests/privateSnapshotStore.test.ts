import { beforeEach, describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { privateSnapshotStore } from '../src/state/privateSnapshotStore.js';

describe('privateSnapshotStore', () => {
  beforeEach(() => privateSnapshotStore.getState().reset());

  it('should store detection snapshots locally and expire them by server time', () => {
    privateSnapshotStore.getState().addDetection({
      type: 'private_sonar_snapshot',
      snapshotId: 'scan-1',
      detectedPlayerId: 'opponent',
      position: { x: 120, y: 80 },
      detectedAtServerMs: 1_000,
      expiresAtServerMs: 2_250,
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

  it('predicts a local pulse and reconciles it to accepted server timing', () => {
    privateSnapshotStore.getState().predictSonar(7, 1_000, { x: 80, y: 90 });
    expect(privateSnapshotStore.getState().localSonarPulse).toMatchObject({
      requestSequence: 7,
      status: 'predicted',
      startedAtServerMs: 1_000,
      origin: { x: 80, y: 90 },
    });

    privateSnapshotStore.getState().applySonarStatus({
      type: 'sonar_status',
      accepted: true,
      requestSequence: 7,
      activatedAtServerMs: 1_100,
      readyAtServerMs: 4_100,
    });

    expect(privateSnapshotStore.getState().sonarReadyAtServerMs).toBe(4_100);
    expect(privateSnapshotStore.getState().localSonarPulse).toEqual({
      requestSequence: 7,
      status: 'accepted',
      origin: { x: 80, y: 90 },
      startedAtServerMs: 1_100,
      expiresAtServerMs: 1_100 + GAMEPLAY_CONFIG.sonarPulseVisualDurationMs,
    });
    expect(privateSnapshotStore.getState().lastSonarRejection).toBeNull();
  });

  it('cancels a matching prediction on rejection and ignores stale status events', () => {
    privateSnapshotStore.getState().predictSonar(9, 2_000, { x: 80, y: 90 });
    privateSnapshotStore.getState().applySonarStatus({
      type: 'sonar_status',
      accepted: false,
      requestSequence: 9,
      readyAtServerMs: 3_000,
      reason: 'cooldown',
    });
    privateSnapshotStore.getState().applySonarStatus({
      type: 'sonar_status',
      accepted: true,
      requestSequence: 8,
      activatedAtServerMs: 2_100,
      readyAtServerMs: 5_100,
    });

    expect(privateSnapshotStore.getState().localSonarPulse).toBeNull();
    expect(privateSnapshotStore.getState().sonarReadyAtServerMs).toBe(3_000);
    expect(privateSnapshotStore.getState().lastSonarRejection).toEqual({
      requestSequence: 9,
      reason: 'cooldown',
    });
  });

  it('restores authoritative sonar readiness and clears transient prediction state', () => {
    privateSnapshotStore.getState().predictSonar(2, 500, { x: 80, y: 90 });
    privateSnapshotStore.getState().restoreSonarReadiness(6_000);

    expect(privateSnapshotStore.getState().sonarReadyAtServerMs).toBe(6_000);
    expect(privateSnapshotStore.getState().localSonarPulse).toBeNull();
    expect(privateSnapshotStore.getState().lastSonarRejection).toBeNull();
  });

  it('tracks pending, accepted, and replaced explicit shot locks', () => {
    privateSnapshotStore.getState().predictShotLock(4, 1.2);
    expect(privateSnapshotStore.getState().pendingShotLock).toEqual({
      requestSequence: 4,
      aimAngleRad: 1.2,
    });

    privateSnapshotStore.getState().applyShotLockStatus({
      type: 'shot_lock_status',
      accepted: true,
      requestSequence: 4,
      lockedAimAngleRad: 1.2,
      lockSource: 'explicit',
      replaced: false,
      serverTimeMs: 2_000,
    });
    expect(privateSnapshotStore.getState().pendingShotLock).toBeNull();
    expect(privateSnapshotStore.getState().shotLockStatus).toMatchObject({
      accepted: true,
      lockSource: 'explicit',
      replaced: false,
    });

    privateSnapshotStore.getState().predictShotLock(5, 1.8);
    privateSnapshotStore.getState().applyShotLockStatus({
      type: 'shot_lock_status',
      accepted: true,
      requestSequence: 5,
      lockedAimAngleRad: 1.8,
      lockSource: 'explicit',
      replaced: true,
      serverTimeMs: 2_100,
    });
    expect(privateSnapshotStore.getState().shotLockStatus).toMatchObject({
      requestSequence: 5,
      replaced: true,
    });
  });

  it('applies automatic/rejected lock feedback and restores private lock state', () => {
    privateSnapshotStore.getState().predictShotLock(8, 0.5);
    privateSnapshotStore.getState().applyShotLockStatus({
      type: 'shot_lock_status',
      accepted: false,
      requestSequence: 8,
      reason: 'wrong_phase',
      serverTimeMs: 3_000,
    });
    expect(privateSnapshotStore.getState().pendingShotLock).toBeNull();
    expect(privateSnapshotStore.getState().shotLockStatus).toMatchObject({
      accepted: false,
      reason: 'wrong_phase',
    });

    privateSnapshotStore.getState().restoreShotLock({
      type: 'shot_lock_status',
      accepted: true,
      requestSequence: 0,
      lockedAimAngleRad: 2.4,
      lockSource: 'automatic',
      replaced: false,
      serverTimeMs: 3_100,
    });
    expect(privateSnapshotStore.getState().shotLockStatus).toMatchObject({
      accepted: true,
      lockSource: 'automatic',
      lockedAimAngleRad: 2.4,
    });
  });
});
