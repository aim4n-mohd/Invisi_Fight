import { describe, expect, it } from 'vitest';
import type { PublicPlayerState } from '@invisi-fight/shared';
import { selectVisibleFighters } from '../src/game-three/renderers/fighterVisibility.js';

const players: PublicPlayerState[] = [
  {
    playerId: 'local',
    inCurrentRoster: true,
    readyForNextMatch: false,
    rivalryWins: 0,
    resultStats: null,
    award: null,
    displayName: 'Local',
    role: 'host',
    hearts: 2,
    connected: true,
    alive: true,
    isHost: true,
    revealedPosition: { x: 120, y: 140 },
    lockedAimAngleRad: 0,
  },
  {
    playerId: 'opponent',
    inCurrentRoster: true,
    readyForNextMatch: false,
    rivalryWins: 0,
    resultStats: null,
    award: null,
    displayName: 'Opponent',
    role: 'player',
    hearts: 2,
    connected: true,
    alive: true,
    isHost: false,
    revealedPosition: { x: 800, y: 400 },
    lockedAimAngleRad: Math.PI,
  },
];

describe('Three.js fighter visibility', () => {
  it.each(['lobby', 'countdown', 'echo_hunt', 'final_echo', 'results'] as const)(
    'never uses public opponent coordinates in Echo %s',
    (phase) => {
      const visible = selectVisibleFighters({
        mode: 'echo_hunt',
        phase,
        localPlayerId: 'local',
        localPosition: { x: 1, y: 2 },
        localAimAngleRad: 0,
        localMoving: false,
        activeShooterId: null,
        players,
      });
      expect(visible.map((fighter) => fighter.playerId)).toEqual(['local']);
      expect(
        selectVisibleFighters({
          mode: 'echo_hunt',
          phase,
          localPlayerId: 'watcher',
          localPosition: null,
          localAimAngleRad: 0,
          localMoving: false,
          activeShooterId: null,
          players,
        }),
      ).toEqual([]);
    },
  );
  it('uses only private local state during hidden phases', () => {
    const visible = selectVisibleFighters({
      phase: 'hunt',
      localPlayerId: 'local',
      localPosition: { x: 300, y: 200 },
      localAimAngleRad: Math.PI / 4,
      localMoving: true,
      activeShooterId: null,
      players,
    });

    expect(visible).toEqual([
      expect.objectContaining({
        playerId: 'local',
        position: { x: 300, y: 200 },
        aimAngleRad: Math.PI / 4,
        local: true,
      }),
    ]);
  });

  it('renders public frozen positions and locks only after resolution begins', () => {
    const visible = selectVisibleFighters({
      phase: 'resolution',
      localPlayerId: 'local',
      localPosition: null,
      localAimAngleRad: 0,
      localMoving: false,
      activeShooterId: 'opponent',
      players,
    });

    expect(visible).toHaveLength(2);
    expect(visible.find((fighter) => fighter.playerId === 'opponent')).toEqual(
      expect.objectContaining({ aimAngleRad: Math.PI, active: true, local: false }),
    );
  });
});
