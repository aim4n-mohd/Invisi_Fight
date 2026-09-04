import { settingsStore, type VolumeChannel } from '../state/settingsStore.js';
import { roomClient } from '../network/colyseusClient.js';
import { gameAudio } from '../audio/GameAudio.js';
import { Button } from '../components/ui/Button.js';

export function openSettings(): void {
  if (document.querySelector('[aria-modal="true"]')) return;
  roomClient.stopInput();
  gameAudio.unlock();
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'settings-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Settings');
  const title = document.createElement('h2');
  title.textContent = 'Settings';
  dialog.append(title);
  for (const channel of ['master', 'music', 'sfx'] as VolumeChannel[]) {
    const label = document.createElement('label');
    label.textContent = channel === 'sfx' ? 'SFX' : channel[0]!.toUpperCase() + channel.slice(1);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(settingsStore.getState()[channel] * 100);
    const value = document.createElement('output');
    value.textContent = `${input.value}%`;
    input.addEventListener('input', () => {
      settingsStore.getState().setVolume(channel, Number(input.value) / 100);
      value.textContent = `${input.value}%`;
    });
    label.append(input, value);
    dialog.append(label);
  }
  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');
  dialog.append(
    Button({
      label: 'Toggle fullscreen',
      onClick: () => {
        const operation = document.fullscreenElement
          ? document.exitFullscreen?.()
          : document.documentElement.requestFullscreen?.();
        if (!operation) feedback.textContent = 'Fullscreen is not available in this browser.';
        else
          void operation.catch(() => {
            feedback.textContent = 'Fullscreen could not open. You can keep playing here.';
          });
      },
    }),
    feedback,
    Button({ label: 'Close settings', onClick: () => dialog.close() }),
  );
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  });
  document.body.append(dialog);
  dialog.showModal();
}
