import { Group, type Scene } from 'three';
import type { VisibleFighterState } from './fighterVisibility.js';
import { FighterModel } from '../models/FighterModel.js';

export class FighterRenderer {
  readonly object = new Group();
  readonly #fighters = new Map<string, FighterModel>();

  constructor(scene: Scene) {
    this.object.name = 'fighters';
    scene.add(this.object);
  }

  sync(states: readonly VisibleFighterState[], elapsedSeconds: number, scale = 1): void {
    const visibleIds = new Set(states.map((state) => state.playerId));
    this.#fighters.forEach((fighter, playerId) => {
      if (visibleIds.has(playerId)) return;
      fighter.object.removeFromParent();
      fighter.dispose();
      this.#fighters.delete(playerId);
    });

    states.forEach((state) => {
      let fighter = this.#fighters.get(state.playerId);
      if (!fighter) {
        fighter = new FighterModel({ color: state.local ? 0x4d8cff : 0xffbf33 });
        fighter.object.userData.playerId = state.playerId;
        this.#fighters.set(state.playerId, fighter);
        this.object.add(fighter.object);
      }
      fighter.setPosition(state.position);
      fighter.object.scale.setScalar(scale);
      fighter.setAimAngle(state.aimAngleRad);
      fighter.setMoving(state.moving);
      fighter.setAppearance({ active: state.active, alive: state.alive, hit: state.hit });
      fighter.animate(elapsedSeconds);
    });
  }

  dispose(): void {
    this.#fighters.forEach((fighter) => fighter.dispose());
    this.#fighters.clear();
    this.object.removeFromParent();
  }
}
