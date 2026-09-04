import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export interface SessionRecord {
  roomId: string;
  playerId: string;
  expiresAtMs: number;
  revoked: boolean;
}

function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export class SessionService {
  readonly #sessions = new Map<string, SessionRecord>();

  issue(record: Omit<SessionRecord, 'revoked'>): string {
    const token = randomBytes(32).toString('base64url');
    this.#sessions.set(tokenHash(token).toString('hex'), { ...record, revoked: false });
    return token;
  }

  verify(token: string, expectedRoomId?: string, nowMs = Date.now()): SessionRecord | null {
    if (token.length < 32) return null;
    const incomingHash = tokenHash(token);
    let matched: SessionRecord | null = null;

    for (const [hashHex, record] of this.#sessions) {
      const storedHash = Buffer.from(hashHex, 'hex');
      if (storedHash.length === incomingHash.length && timingSafeEqual(storedHash, incomingHash)) {
        matched = record;
        break;
      }
    }

    if (!matched || matched.revoked || matched.expiresAtMs <= nowMs) return null;
    if (expectedRoomId && matched.roomId !== expectedRoomId) return null;
    return { ...matched };
  }

  rotate(token: string, nowMs = Date.now()): string | null {
    const record = this.verify(token, undefined, nowMs);
    if (!record) return null;
    this.revoke(token);
    return this.issue({ ...record, expiresAtMs: record.expiresAtMs });
  }

  revoke(token: string): boolean {
    const key = tokenHash(token).toString('hex');
    const record = this.#sessions.get(key);
    if (!record) return false;
    record.revoked = true;
    return true;
  }

  revokeRoom(roomId: string): void {
    for (const record of this.#sessions.values()) {
      if (record.roomId === roomId) record.revoked = true;
    }
  }
}
