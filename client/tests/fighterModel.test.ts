import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FighterModel } from '../src/game-three/models/FighterModel.js';

describe('FighterModel', () => {
  it('builds a compact fighter with a separate gun and aims along the requested angle', () => {
    const fighter = new FighterModel({ color: 0x4d8cff });
    const gun = fighter.object.getObjectByName('fighter-gun');

    expect(gun).toBeDefined();
    fighter.setAimAngle(Math.PI / 2);
    const direction = new Vector3(1, 0, 0).applyQuaternion(fighter.object.quaternion);
    expect(direction.x).toBeCloseTo(0, 5);
    expect(direction.z).toBeCloseTo(1, 5);

    fighter.dispose();
  });
});
