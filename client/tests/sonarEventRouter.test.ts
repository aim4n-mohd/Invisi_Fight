import { beforeEach, describe, expect, it } from 'vitest';
import {
  routePrivateSonarSnapshot,
  routePublicSonarEmission,
  routeShotLockStatus,
  routeSonarStatus,
} from '../src/network/sonarEventRouter.js';
import { matchViewStore } from '../src/state/matchViewStore.js';
import { privateSnapshotStore } from '../src/state/privateSnapshotStore.js';

describe('sonarEventRouter', () => {
  beforeEach(() => {
    matchViewStore.getState().reset();
    privateSnapshotStore.getState().reset();
  });

  it('routes only schema-valid sonar events into client state', () => {
    expect(routePrivateSonarSnapshot({ type: 'private_sonar_snapshot', exactOrigin: true })).toBe(
      false,
    );
    expect(routePublicSonarEmission({ type: 'sonar_emission', exactOrigin: { x: 1, y: 2 } })).toBe(
      false,
    );
    expect(routeSonarStatus({ type: 'sonar_status', accepted: true })).toBe(false);
    expect(routeShotLockStatus({ type: 'shot_lock_status', accepted: true })).toBe(false);
    expect(privateSnapshotStore.getState().detections).toHaveLength(0);
    expect(matchViewStore.getState().sonarEmissions).toHaveLength(0);

    expect(
      routePublicSonarEmission({
        type: 'sonar_emission',
        emissionId: 'pulse-2',
        emitterId: 'player-2',
        approximateOrigin: { x: 144, y: 192 },
        radius: 320,
        emittedAtServerMs: 2_000,
        expiresAtServerMs: 2_500,
      }),
    ).toBe(true);
    expect(matchViewStore.getState().sonarEmissions).toHaveLength(1);

    expect(
      routeShotLockStatus({
        type: 'shot_lock_status',
        accepted: true,
        requestSequence: 2,
        lockedAimAngleRad: 1.4,
        lockSource: 'explicit',
        replaced: false,
        serverTimeMs: 2_100,
      }),
    ).toBe(true);
    expect(privateSnapshotStore.getState().shotLockStatus).toMatchObject({
      accepted: true,
      requestSequence: 2,
    });
  });
});
