import {
  privateSonarSnapshotEventSchema,
  publicSonarEmissionEventSchema,
  shotLockStatusEventSchema,
  sonarStatusEventSchema,
} from '@invisi-fight/shared';
import { matchViewStore } from '../state/matchViewStore.js';
import { privateSnapshotStore } from '../state/privateSnapshotStore.js';

export function routePrivateSonarSnapshot(event: unknown): boolean {
  const parsed = privateSonarSnapshotEventSchema.safeParse(event);
  if (!parsed.success) return false;
  privateSnapshotStore.getState().addDetection(parsed.data);
  return true;
}

export function routeSonarStatus(event: unknown): boolean {
  const parsed = sonarStatusEventSchema.safeParse(event);
  if (!parsed.success) return false;
  privateSnapshotStore.getState().applySonarStatus(parsed.data);
  return true;
}

export function routePublicSonarEmission(event: unknown): boolean {
  const parsed = publicSonarEmissionEventSchema.safeParse(event);
  if (!parsed.success) return false;
  matchViewStore.getState().addSonarEmission(parsed.data);
  return true;
}

export function routeShotLockStatus(event: unknown): boolean {
  const parsed = shotLockStatusEventSchema.safeParse(event);
  if (!parsed.success) return false;
  privateSnapshotStore.getState().applyShotLockStatus(parsed.data);
  return true;
}
