export const ROOM_MESSAGES = {
  SESSION_READY: 'session:ready',
  SESSION_REQUEST: 'session:request',
  PLAYER_INPUT: 'input:player',
  START_MATCH: 'input:start',
  REPLAY_TO_LOBBY: 'input:replay',
  PRIVATE_STATE: 'private:state',
  PRIVATE_SONAR: 'private:sonar',
  SHOT_RESOLVED: 'match:shot',
  ERROR: 'room:error',
} as const;
