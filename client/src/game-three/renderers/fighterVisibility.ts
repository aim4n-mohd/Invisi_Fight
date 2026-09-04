import type { GameMode, MatchPhase, PublicPlayerState, Vector2 } from '@invisi-fight/shared';

export interface VisibleFighterState {
  playerId: string;
  position: Vector2;
  aimAngleRad: number;
  local: boolean;
  active: boolean;
  alive: boolean;
  moving: boolean;
  hit: boolean;
}

interface FighterVisibilityInput {
  mode?: GameMode;
  phase: MatchPhase;
  localPlayerId: string | undefined;
  localPosition: Vector2 | null;
  localAimAngleRad: number;
  localMoving: boolean;
  activeShooterId: string | null;
  hitPlayerId?: string | null;
  players: readonly PublicPlayerState[];
}

export function selectVisibleFighters(input: FighterVisibilityInput): VisibleFighterState[] {
  if (input.mode === 'echo_hunt' || input.phase === 'hunt' || input.phase === 'commit') {
    if (!input.localPlayerId || !input.localPosition) return [];
    const local = input.players.find((player) => player.playerId === input.localPlayerId);
    if (!local?.alive || local.role === 'spectator') return [];
    return [
      {
        playerId: input.localPlayerId,
        position: { ...input.localPosition },
        aimAngleRad: input.localAimAngleRad,
        local: true,
        active: false,
        alive: true,
        moving: input.localMoving,
        hit: false,
      },
    ];
  }

  if (input.phase !== 'resolution' && input.phase !== 'recap' && input.phase !== 'results') {
    return [];
  }
  return input.players.flatMap((player) =>
    player.role === 'spectator' || !player.revealedPosition
      ? []
      : [
          {
            playerId: player.playerId,
            position: { ...player.revealedPosition },
            aimAngleRad: player.lockedAimAngleRad ?? 0,
            local: player.playerId === input.localPlayerId,
            active: player.playerId === input.activeShooterId,
            alive: player.alive,
            moving: false,
            hit: player.playerId === input.hitPlayerId,
          },
        ],
  );
}
