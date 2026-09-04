import { nanoid } from 'nanoid';
import { distanceToBoundary } from './echoGeometry.js';
import {
  COMMON_GAMEPLAY_CONFIG,
  ECHO_GAMEPLAY_CONFIG,
  type PublicSoundCueEvent,
  type Vector2,
} from '@invisi-fight/shared';

type MovementProfile = 'walk' | 'run';
type RandomSource = () => number;

interface FootstepState {
  lastCueAtMs: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export class EchoSoundService {
  readonly #stateByPlayer = new Map<string, FootstepState>();

  constructor(readonly random: RandomSource = Math.random) {}

  recordMovement(
    playerId: string,
    previous: Vector2,
    current: Vector2,
    running: boolean,
    serverTimeMs: number,
  ): PublicSoundCueEvent | null {
    const displacement = Math.hypot(current.x - previous.x, current.y - previous.y);
    const state = this.#stateByPlayer.get(playerId) ?? {
      lastCueAtMs: serverTimeMs,
    };
    if (displacement <= 0.01) {
      state.lastCueAtMs = serverTimeMs;
      this.#stateByPlayer.set(playerId, state);
      return null;
    }
    this.#stateByPlayer.set(playerId, state);
    const profile: MovementProfile = running ? 'run' : 'walk';
    const cadenceMs = running
      ? ECHO_GAMEPLAY_CONFIG.runCueCadenceMs
      : ECHO_GAMEPLAY_CONFIG.walkCueCadenceMs;
    if (serverTimeMs - state.lastCueAtMs < cadenceMs) return null;
    state.lastCueAtMs = serverTimeMs;
    return this.createCue(profile, current, serverTimeMs);
  }

  createCue(
    profile: PublicSoundCueEvent['profile'],
    truePosition: Vector2,
    serverTimeMs: number,
  ): PublicSoundCueEvent {
    const variance =
      profile === 'walk' || profile === 'reload'
        ? ECHO_GAMEPLAY_CONFIG.walkVarianceRadiusPx
        : profile === 'run'
          ? ECHO_GAMEPLAY_CONFIG.runVarianceRadiusPx
          : ECHO_GAMEPLAY_CONFIG.finalEchoVarianceRadiusPx;
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(this.random()) * variance;
    const approximatePosition = {
      x: clamp(truePosition.x + Math.cos(angle) * radius, 0, COMMON_GAMEPLAY_CONFIG.arenaWidth),
      y: clamp(truePosition.y + Math.sin(angle) * radius, 0, COMMON_GAMEPLAY_CONFIG.arenaHeight),
    };
    const intensity =
      profile === 'walk' || profile === 'reload'
        ? ECHO_GAMEPLAY_CONFIG.walkIntensity
        : profile === 'run'
          ? ECHO_GAMEPLAY_CONFIG.runIntensity
          : ECHO_GAMEPLAY_CONFIG.finalEchoIntensity;
    const lifetimeMs =
      profile === 'walk' || profile === 'reload'
        ? ECHO_GAMEPLAY_CONFIG.walkCueLifetimeMs
        : profile === 'run'
          ? ECHO_GAMEPLAY_CONFIG.runCueLifetimeMs
          : ECHO_GAMEPLAY_CONFIG.finalEchoCueLifetimeMs;
    return {
      type: 'sound_cue',
      cueId: nanoid(12),
      profile,
      approximatePosition,
      intensity,
      emittedAtServerMs: serverTimeMs,
      expiresAtServerMs: serverTimeMs + lifetimeMs,
    };
  }

  decoyTrail(origin: Vector2, angleRad: number, startedAtServerMs: number): PublicSoundCueEvent[] {
    const direction = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    const travel = Math.min(
      ECHO_GAMEPLAY_CONFIG.decoyTravelPx,
      distanceToBoundary(origin, angleRad),
    );
    return Array.from({ length: ECHO_GAMEPLAY_CONFIG.decoyStepCount }, (_, index) => {
      const progress = (index + 1) / ECHO_GAMEPLAY_CONFIG.decoyStepCount;
      const truePosition = {
        x: clamp(
          origin.x + direction.x * Math.min(ECHO_GAMEPLAY_CONFIG.decoyTravelPx * progress, travel),
          0,
          COMMON_GAMEPLAY_CONFIG.arenaWidth,
        ),
        y: clamp(
          origin.y + direction.y * Math.min(ECHO_GAMEPLAY_CONFIG.decoyTravelPx * progress, travel),
          0,
          COMMON_GAMEPLAY_CONFIG.arenaHeight,
        ),
      };
      const emittedAtServerMs =
        startedAtServerMs +
        Math.round(
          (ECHO_GAMEPLAY_CONFIG.decoyDurationMs * index) / ECHO_GAMEPLAY_CONFIG.decoyStepCount,
        );
      return this.createCue('walk', truePosition, emittedAtServerMs);
    });
  }

  resetPlayer(playerId: string): void {
    this.#stateByPlayer.delete(playerId);
  }

  reset(): void {
    this.#stateByPlayer.clear();
  }
}
