import { DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, type Scene } from 'three';
import {
  GAMEPLAY_CONFIG,
  type PrivateSonarSnapshotEvent,
  type PublicSonarEmissionEvent,
  type Vector2,
} from '@invisi-fight/shared';
import type { LocalSonarPulse } from '../../state/privateSnapshotStore.js';
import { FighterModel } from '../models/FighterModel.js';
import { simulationToWorld } from '../math/coordinates.js';

interface PulseState {
  key: string;
  origin: Vector2;
  radius: number;
  startedAtServerMs: number;
  expiresAtServerMs: number;
  color: number;
}

function progress(start: number, end: number, now: number): number {
  return Math.max(0, Math.min(1, (now - start) / Math.max(1, end - start)));
}

export class SonarRenderer {
  readonly object = new Group();
  readonly #pulses = new Map<string, Mesh<RingGeometry, MeshBasicMaterial>>();
  readonly #detections = new Map<string, FighterModel>();

  constructor(scene: Scene) {
    this.object.name = 'sonar-effects';
    scene.add(this.object);
  }

  sync(
    localPulse: LocalSonarPulse | null,
    detections: readonly PrivateSonarSnapshotEvent[],
    emissions: readonly PublicSonarEmissionEvent[],
    nowMs: number,
  ): void {
    const pulses: PulseState[] = [];
    if (localPulse && localPulse.expiresAtServerMs > nowMs) {
      pulses.push({
        key: `local-${localPulse.requestSequence}`,
        origin: localPulse.origin,
        radius: GAMEPLAY_CONFIG.sonarPulseRadiusPx,
        startedAtServerMs: localPulse.startedAtServerMs,
        expiresAtServerMs: localPulse.expiresAtServerMs,
        color: 0x4db2ff,
      });
    }
    emissions.forEach((emission) => {
      if (emission.expiresAtServerMs <= nowMs) return;
      pulses.push({
        key: emission.emissionId,
        origin: emission.approximateOrigin,
        radius: emission.radius,
        startedAtServerMs: emission.emittedAtServerMs,
        expiresAtServerMs: emission.expiresAtServerMs,
        color: 0xff7a59,
      });
    });
    this.#syncPulses(pulses, nowMs);
    this.#syncDetections(detections, nowMs);
  }

  dispose(): void {
    this.#pulses.forEach((pulse) => {
      pulse.geometry.dispose();
      pulse.material.dispose();
    });
    this.#pulses.clear();
    this.#detections.forEach((fighter) => fighter.dispose());
    this.#detections.clear();
    this.object.removeFromParent();
  }

  #syncPulses(states: readonly PulseState[], nowMs: number): void {
    const keys = new Set(states.map((state) => state.key));
    this.#pulses.forEach((pulse, key) => {
      if (keys.has(key)) return;
      pulse.geometry.dispose();
      pulse.material.dispose();
      pulse.removeFromParent();
      this.#pulses.delete(key);
    });
    states.forEach((state) => {
      let pulse = this.#pulses.get(state.key);
      if (!pulse) {
        pulse = new Mesh(
          new RingGeometry(0.955, 1, 64),
          new MeshBasicMaterial({
            color: state.color,
            transparent: true,
            opacity: 1,
            side: DoubleSide,
            depthWrite: false,
          }),
        );
        pulse.name = 'sonar-pulse';
        pulse.rotation.x = -Math.PI / 2;
        this.#pulses.set(state.key, pulse);
        this.object.add(pulse);
      }
      const pulseProgress = progress(state.startedAtServerMs, state.expiresAtServerMs, nowMs);
      const radius = Math.max(2, state.radius * pulseProgress);
      const world = simulationToWorld(state.origin, 1.2);
      pulse.position.set(world.x, world.y, world.z);
      pulse.scale.setScalar(radius);
      pulse.material.opacity = Math.max(0.16, 1 - pulseProgress);
    });
  }

  #syncDetections(states: readonly PrivateSonarSnapshotEvent[], nowMs: number): void {
    const active = states.filter((state) => state.expiresAtServerMs > nowMs);
    const keys = new Set(active.map((state) => state.snapshotId));
    this.#detections.forEach((fighter, key) => {
      if (keys.has(key)) return;
      fighter.object.removeFromParent();
      fighter.dispose();
      this.#detections.delete(key);
    });
    active.forEach((state) => {
      let fighter = this.#detections.get(state.snapshotId);
      if (!fighter) {
        fighter = new FighterModel({ color: 0xd8e2ff, hologram: true });
        fighter.object.name = 'sonar-hologram';
        this.#detections.set(state.snapshotId, fighter);
        this.object.add(fighter.object);
      }
      const alpha = 1 - progress(state.detectedAtServerMs, state.expiresAtServerMs, nowMs);
      fighter.setPosition(state.position);
      fighter.setAppearance({ active: false, alive: true, opacity: alpha });
    });
  }
}
