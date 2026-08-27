import { BufferGeometry, Group, Line, LineBasicMaterial, Vector3, type Scene } from 'three';
import type {
  MatchPhase,
  PublicPlayerState,
  ShotLockStatusEvent,
  Vector2,
} from '@invisi-fight/shared';
import { rayToArenaBoundary, simulationToWorld } from '../math/coordinates.js';

interface AimLineState {
  key: string;
  origin: Vector2;
  angleRad: number;
  color: number;
  opacity: number;
  height: number;
}

export class AimRenderer {
  readonly object = new Group();
  readonly #lines = new Map<string, Line<BufferGeometry, LineBasicMaterial>>();

  constructor(scene: Scene) {
    this.object.name = 'aim-trajectories';
    scene.add(this.object);
  }

  sync(
    phase: MatchPhase,
    localPosition: Vector2 | null,
    localAimAngleRad: number,
    players: readonly PublicPlayerState[],
    shotLockStatus: ShotLockStatusEvent | null,
    activeShooterId: string | null,
  ): void {
    const desired: AimLineState[] = [];
    if ((phase === 'hunt' || phase === 'commit') && localPosition) {
      desired.push({
        key: 'local-provisional',
        origin: localPosition,
        angleRad: localAimAngleRad,
        color: 0xd8e2ff,
        opacity: phase === 'hunt' ? 0.42 : 0.66,
        height: 2.4,
      });
      if (phase === 'commit' && shotLockStatus?.accepted) {
        desired.push({
          key: 'local-locked',
          origin: localPosition,
          angleRad: shotLockStatus.lockedAimAngleRad,
          color: 0x59d98e,
          opacity: 0.96,
          height: 3.1,
        });
      }
    }
    if (phase === 'resolution' || phase === 'recap') {
      players.forEach((player) => {
        if (!player.revealedPosition || player.lockedAimAngleRad === null) return;
        desired.push({
          key: `resolved-${player.playerId}`,
          origin: player.revealedPosition,
          angleRad: player.lockedAimAngleRad,
          color: player.playerId === activeShooterId ? 0xffd166 : 0x8b96ad,
          opacity: player.playerId === activeShooterId ? 0.94 : 0.28,
          height: 2.2,
        });
      });
    }

    const desiredKeys = new Set(desired.map((state) => state.key));
    this.#lines.forEach((line, key) => {
      if (desiredKeys.has(key)) return;
      line.geometry.dispose();
      line.material.dispose();
      line.removeFromParent();
      this.#lines.delete(key);
    });
    desired.forEach((state) => this.#updateLine(state));
  }

  dispose(): void {
    this.#lines.forEach((line) => {
      line.geometry.dispose();
      line.material.dispose();
    });
    this.#lines.clear();
    this.object.removeFromParent();
  }

  #updateLine(state: AimLineState): void {
    let line = this.#lines.get(state.key);
    if (!line) {
      line = new Line(
        new BufferGeometry(),
        new LineBasicMaterial({ transparent: true, depthWrite: false }),
      );
      line.name = state.key;
      this.#lines.set(state.key, line);
      this.object.add(line);
    }
    const end = rayToArenaBoundary(state.origin, state.angleRad);
    const worldOrigin = simulationToWorld(state.origin, state.height);
    const worldEnd = simulationToWorld(end, state.height);
    line.geometry.setFromPoints([
      new Vector3(worldOrigin.x, worldOrigin.y, worldOrigin.z),
      new Vector3(worldEnd.x, worldEnd.y, worldEnd.z),
    ]);
    line.material.color.setHex(state.color);
    line.material.opacity = state.opacity;
  }
}
