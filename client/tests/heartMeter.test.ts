import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { HeartMeter } from '../src/components/hud/HeartMeter.js';

describe('HeartMeter', () => {
  it('renders and announces the configured two-heart maximum', () => {
    const meter = HeartMeter(1, 'Scanner');
    expect(meter.querySelectorAll('.heart-meter__heart')).toHaveLength(
      GAMEPLAY_CONFIG.startingHearts,
    );
    expect(meter.getAttribute('aria-label')).toBe(
      `Scanner: 1 of ${GAMEPLAY_CONFIG.startingHearts} hearts remaining`,
    );
    expect(meter.querySelectorAll('.heart-meter__heart--empty')).toHaveLength(1);
  });
});
