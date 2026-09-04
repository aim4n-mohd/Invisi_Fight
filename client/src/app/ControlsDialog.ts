import type { GameMode } from '@invisi-fight/shared';
import { Button } from '../components/ui/Button.js';
import { gameAudio } from '../audio/GameAudio.js';

export function showControls(mode: GameMode, continueAction: () => void): void {
  if (document.querySelector('[aria-modal="true"]')) return;
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'settings-dialog controls-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', `${mode === 'classic' ? 'Classic' : 'Echo Hunt'} controls`);
  const title = document.createElement('h2');
  title.textContent = mode === 'classic' ? 'Classic' : 'Echo Hunt';
  const instructions =
    mode === 'classic'
      ? [
          'Move during Hunt: WASD or arrow keys',
          'Sonar: Space',
          'Aim with mouse; click to lock during Commit',
          'Two hearts; last fighter standing wins',
          'The host starts from the lobby',
        ]
      : [
          'Move: WASD or arrow keys; hold Shift to run',
          'Aim and fire: mouse and left-click',
          'Three shots · auto-reload when empty · reload clicks reveal your area',
          'Steps reveal approximate positions; shots expose you',
          'Sonar: Space',
          'Decoy: right-click, once per match',
          'Last fighter standing wins',
        ];
  let submitted = false;
  const proceed = Button({
    label: '×',
    onClick: () => {
      if (submitted) return;
      submitted = true;
      gameAudio.unlock();
      dialog.close();
      continueAction();
    },
  });
  proceed.classList.add('controls-dialog__continue');
  proceed.setAttribute('aria-label', 'Close controls and enter arena');
  const list = document.createElement('ul');
  for (const text of instructions) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  }
  dialog.append(title, proceed, list, Button({ label: 'Back', onClick: () => dialog.close() }));
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (!submitted && previous instanceof HTMLElement && previous.isConnected) previous.focus();
  });
  document.body.append(dialog);
  dialog.showModal();
  proceed.focus();
}
