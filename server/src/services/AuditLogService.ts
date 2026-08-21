import { createHash, randomUUID } from 'node:crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AuditContext {
  eventName: string;
  roomId?: string;
  phase?: string;
  playerId?: string;
  errorCode?: string;
  detail?: Record<string, unknown>;
}

function hashIdentifier(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export class AuditLogService {
  write(level: LogLevel, context: AuditContext): void {
    const payload = {
      timestamp: new Date().toISOString(),
      requestId: randomUUID(),
      environment: process.env.NODE_ENV ?? 'development',
      eventName: context.eventName,
      roomId: context.roomId,
      phase: context.phase,
      userIdHash: hashIdentifier(context.playerId),
      errorCode: context.errorCode,
      detail: context.detail,
    };
    const serialized = JSON.stringify(payload);
    if (level === 'error') console.error(serialized);
    else if (level === 'warn') console.warn(serialized);
    else if (level === 'debug') console.debug(serialized);
    else console.info(serialized);
  }
}
