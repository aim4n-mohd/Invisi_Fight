import { describe, expect, it } from 'vitest';
import { pulseProgress, snapshotAlpha } from '../src/game/systems/SonarRenderSystem.js';

describe('SonarRenderSystem visibility', () => {
  it('expands a manual pulse across its server-timed visual lifetime', () => {
    expect(pulseProgress(1_000, 1_500, 1_000)).toBe(0);
    expect(pulseProgress(1_000, 1_500, 1_250)).toBe(0.5);
    expect(pulseProgress(1_000, 1_500, 1_500)).toBe(1);
  });

  it('keeps a frozen detection visible until snapshot expiry without wedge gating', () => {
    expect(snapshotAlpha(1_000, 3_000, 1_500)).toBe(0.75);
    expect(snapshotAlpha(1_000, 3_000, 2_999)).toBeGreaterThan(0);
    expect(snapshotAlpha(1_000, 3_000, 3_000)).toBe(0);
  });
});
