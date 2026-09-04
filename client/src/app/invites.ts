import { roomCodeSchema, type GameMode } from '@invisi-fight/shared';

export function readInvite(search: string): { roomCode: string; mode: GameMode } {
  const params = new URLSearchParams(search);
  const code = roomCodeSchema.safeParse(params.get('room')?.toUpperCase());
  return {
    roomCode: code.success ? code.data : '',
    mode: params.get('mode') === 'classic' ? 'classic' : 'echo_hunt',
  };
}

export function inviteUrl(roomCode: string, mode: GameMode): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set('room', roomCode);
  url.searchParams.set('mode', mode);
  return url.toString();
}

export async function copyInvite(
  roomCode: string,
  mode: GameMode,
  fallback: HTMLElement,
): Promise<void> {
  const url = inviteUrl(roomCode, mode);
  try {
    await navigator.clipboard.writeText(url);
    fallback.textContent = 'Invite copied';
  } catch {
    const input = document.createElement('input');
    input.readOnly = true;
    input.value = url;
    input.setAttribute('aria-label', 'Invite link — copy manually');
    fallback.replaceChildren(input);
    input.select();
  }
}
