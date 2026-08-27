import { describe, expect, it } from 'vitest';
import type { PublicPlayerState, RecapEntry } from '@invisi-fight/shared';
import { RecapPanel, shouldShowRoundRecap } from '../src/components/hud/RecapPanel.js';

describe('RecapPanel', () => {
  it('becomes visible when the final Resolution entry arrives', () => {
    expect(shouldShowRoundRecap('resolution', 1, 2)).toBe(false);
    expect(shouldShowRoundRecap('resolution', 2, 2)).toBe(true);
    expect(shouldShowRoundRecap('recap', 0, 2)).toBe(true);
    expect(shouldShowRoundRecap('hunt', 2, 2)).toBe(false);
  });

  it('renders ordered outcomes and the next first shooter in plain language', () => {
    const players: PublicPlayerState[] = [
      {
        playerId: 'host',
        displayName: 'Host',
        role: 'host',
        hearts: 2,
        connected: true,
        alive: true,
        isHost: true,
        revealedPosition: { x: 100, y: 100 },
        lockedAimAngleRad: 0,
      },
      {
        playerId: 'guest',
        displayName: 'Guest',
        role: 'player',
        hearts: 1,
        connected: true,
        alive: true,
        isHost: false,
        revealedPosition: { x: 200, y: 100 },
        lockedAimAngleRad: Math.PI,
      },
    ];
    const entries: RecapEntry[] = [
      {
        shotId: 'shot-1',
        orderIndex: 0,
        shooterId: 'host',
        outcome: 'hit',
        targetId: 'guest',
        targetHeartsRemaining: 1,
        fatal: false,
        resolvedAtServerMs: 1_000,
      },
      {
        shotId: 'shot-2',
        orderIndex: 1,
        shooterId: 'guest',
        outcome: 'miss',
        targetId: null,
        targetHeartsRemaining: null,
        fatal: false,
        resolvedAtServerMs: 2_200,
      },
    ];

    const panel = RecapPanel(entries, players, 'guest');
    const rows = panel.querySelectorAll('.recap-list__item');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Host hit Guest');
    expect(rows[0]?.textContent).toContain('1 heart');
    expect(rows[1]?.textContent).toContain('Guest missed');
    expect(panel.textContent).toContain('Guest starts next');
  });
});
