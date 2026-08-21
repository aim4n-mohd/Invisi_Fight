import { randomInt } from 'node:crypto';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRoomCode(): string {
  let code = '';
  for (let index = 0; index < GAMEPLAY_CONFIG.roomCodeLength; index += 1) {
    code += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return code;
}
