import { DoubleSide, Mesh, MeshBasicMaterial, RingGeometry, type Scene } from 'three';
import {
  ECHO_GAMEPLAY_CONFIG as ECHO,
  GAMEPLAY_CONFIG,
  type ShotResolutionEvent,
} from '@invisi-fight/shared';
import { matchViewStore } from '../../state/matchViewStore.js';
import { echoStore } from '../../state/echoStore.js';
import { privateSnapshotStore } from '../../state/privateSnapshotStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { gameAudio } from '../../audio/GameAudio.js';
import { ShotEffects } from './ShotEffects.js';
import { FighterModel } from '../models/FighterModel.js';
import { rayToArenaBoundary, simulationToWorld } from '../math/coordinates.js';

/** Renders only event snapshots, never a remote fighter's ongoing position. */
export class EchoEffects {
  #shots = new Map<string, ShotEffects>();
  #rings = new Map<string, Mesh<RingGeometry, MeshBasicMaterial>>();
  #reveals = new Map<string, FighterModel>();
  #played = new Set<string>();
  #round = -1;
  constructor(readonly scene: Scene) {}

  sync(now: number): void {
    const match = matchViewStore.getState();
    if (match.roundNumber !== this.#round) {
      this.clear();
      this.#round = match.roundNumber;
    }
    const localId = sessionStore.getState().roomSession?.playerId ?? '';
    const predictions = echoStore.getState().predictions;
    const liveShots = match.shotEvents.filter(
      (shot) => !shot.cancelled && now - shot.resolvedAtServerMs < ECHO.shotEffectLifetimeMs,
    );
    const events: ShotResolutionEvent[] = [...liveShots];
    for (const prediction of predictions) {
      if (
        now - prediction.createdAtServerMs >= ECHO.shotEffectLifetimeMs ||
        match.shotEvents.some(
          (shot) => shot.shooterId === localId && shot.requestSequence === prediction.sequence,
        )
      )
        continue;
      events.push({
        type: 'shot_resolved',
        shotId: `prediction-${prediction.sequence}`,
        roundNumber: match.roundNumber,
        shooterId: localId,
        targetId: null,
        origin: prediction.origin,
        end: rayToArenaBoundary(prediction.origin, prediction.angleRad),
        cancelled: false,
        fatal: false,
        resolvedAtServerMs: prediction.createdAtServerMs,
        requestSequence: prediction.sequence,
      });
    }
    const shotIds = new Set(events.map((event) => event.shotId));
    this.#shots.forEach((effect, id) => {
      if (!shotIds.has(id)) {
        effect.dispose();
        this.#shots.delete(id);
      }
    });
    for (const event of events) {
      let effect = this.#shots.get(event.shotId);
      if (!effect) {
        effect = new ShotEffects(this.scene, false, true);
        this.#shots.set(event.shotId, effect);
      }
      const predicted =
        event.shooterId === localId
          ? predictions.find((shot) => shot.sequence === event.requestSequence)
          : undefined;
      effect.sync(event, now, predicted?.createdAtServerMs, event.shotId.startsWith('prediction-'));
      const key =
        event.shooterId === localId && event.requestSequence !== undefined
          ? `local-shot-${event.requestSequence}`
          : event.shotId;
      this.#once(key, () => gameAudio.play('gunshot'));
      if (!event.shotId.startsWith('prediction-'))
        this.#once(`impact-${event.shotId}`, () =>
          gameAudio.play(event.targetId ? 'hit' : 'miss', 0.8),
        );
    }

    const revealIds = new Set<string>();
    for (const shot of liveShots) {
      for (const [kind, id, position] of [
        ['shooter', shot.shooterId, shot.origin],
        ['target', shot.targetId, shot.end],
      ] as const) {
        if (!id || id === localId) continue;
        const key = `${shot.shotId}-${kind}`;
        revealIds.add(key);
        let fighter = this.#reveals.get(key);
        if (!fighter) {
          fighter = new FighterModel({ color: 0xffbf33 });
          this.#reveals.set(key, fighter);
          this.scene.add(fighter.object);
        }
        fighter.object.scale.setScalar(ECHO.fighterVisualScale);
        fighter.setPosition(position);
        fighter.setAimAngle(
          kind === 'shooter'
            ? Math.atan2(shot.end.y - shot.origin.y, shot.end.x - shot.origin.x)
            : 0,
        );
        fighter.setAppearance({
          active: false,
          alive: !(kind === 'target' && shot.fatal),
          hit: kind === 'target',
          opacity: Math.max(0, 1 - (now - shot.resolvedAtServerMs) / ECHO.shotEffectLifetimeMs),
        });
      }
    }
    this.#reveals.forEach((fighter, key) => {
      if (!revealIds.has(key)) {
        fighter.object.removeFromParent();
        fighter.dispose();
        this.#reveals.delete(key);
      }
    });

    const cues = match.soundCues.filter((cue) => cue.expiresAtServerMs > now);
    const cueIds = new Set(cues.map((cue) => cue.cueId));
    this.#rings.forEach((ring, id) => {
      if (!cueIds.has(id)) {
        ring.removeFromParent();
        ring.geometry.dispose();
        ring.material.dispose();
        this.#rings.delete(id);
      }
    });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const cue of cues) {
      let ring = this.#rings.get(cue.cueId);
      if (!ring) {
        ring = new Mesh(
          new RingGeometry(0.88, 1, 40),
          new MeshBasicMaterial({
            color: cue.profile === 'final_echo' ? 0xffaa55 : 0x7dc8d2,
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.#rings.set(cue.cueId, ring);
      }
      const world = simulationToWorld(cue.approximatePosition, 1.5);
      ring.position.set(world.x, world.y, world.z);
      const age = Math.max(
        0,
        (now - cue.emittedAtServerMs) / (cue.expiresAtServerMs - cue.emittedAtServerMs),
      );
      ring.scale.setScalar((12 + cue.intensity * 24) * (reduced ? 1 : 1 + age));
      ring.material.opacity = (0.35 + cue.intensity * 0.6) * (1 - age);
      this.#once(cue.cueId, () =>
        gameAudio.play(
          cue.profile === 'reload' ? 'reload' : cue.profile === 'walk' ? 'walk' : 'run',
          cue.intensity,
          (cue.approximatePosition.x / GAMEPLAY_CONFIG.arenaWidth) * 2 - 1,
        ),
      );
    }
    const pulse = privateSnapshotStore.getState().localSonarPulse;
    if (pulse) this.#once(`sonar-${pulse.requestSequence}`, () => gameAudio.play('sonar', 0.58));
    for (const emission of match.sonarEmissions) {
      if (emission.emitterId !== localId)
        this.#once(emission.emissionId, () =>
          gameAudio.play(
            'sonar',
            0.35,
            (emission.approximateOrigin.x / GAMEPLAY_CONFIG.arenaWidth) * 2 - 1,
          ),
        );
    }
  }

  clear(): void {
    this.#shots.forEach((shot) => shot.dispose());
    this.#shots.clear();
    this.#rings.forEach((ring) => {
      ring.removeFromParent();
      ring.geometry.dispose();
      ring.material.dispose();
    });
    this.#rings.clear();
    this.#reveals.forEach((fighter) => {
      fighter.object.removeFromParent();
      fighter.dispose();
    });
    this.#reveals.clear();
    this.#played.clear();
  }

  #once(id: string, play: () => void): void {
    if (this.#played.has(id)) return;
    this.#played.add(id);
    if (this.#played.size > ECHO.eventQueueLimit * 4)
      this.#played.delete(this.#played.values().next().value!);
    play();
  }
}
