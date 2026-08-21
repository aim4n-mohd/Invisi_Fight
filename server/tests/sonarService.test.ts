import { describe, expect, it } from 'vitest';
import { SonarService } from '../src/services/SonarService.js';

describe('SonarService', () => {
  it('should emit a fixed private snapshot once per detector/target sweep cycle', () => {
    const service = new SonarService();
    const players = [
      { playerId: 'a', position: { x: 0, y: 0 }, alive: true, spectator: false },
      { playerId: 'b', position: { x: 100, y: 0 }, alive: true, spectator: false },
    ];
    const first = service.sample(players, 1_000, 1_000);
    expect(
      first.find((entry) => entry.detectorId === 'a' && entry.targetId === 'b')?.position,
    ).toEqual({ x: 100, y: 0 });
    players[1]!.position.x = 200;
    const repeated = service.sample(players, 1_010, 1_000);
    expect(repeated.some((entry) => entry.detectorId === 'a' && entry.targetId === 'b')).toBe(
      false,
    );
    expect(first[0]?.position.x).toBe(100);
  });
});
