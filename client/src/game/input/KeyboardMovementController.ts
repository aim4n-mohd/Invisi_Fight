import type { Vector2 } from '@invisi-fight/shared';

const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);

export function gameplayInputBlocked(): boolean {
  const focused = document.activeElement;
  return Boolean(
    document.querySelector('[aria-modal="true"]') ||
    (focused instanceof HTMLElement &&
      focused.matches('input, textarea, select, button, [contenteditable="true"]')),
  );
}

export class KeyboardMovementController {
  readonly #pressed = new Set<string>();
  readonly #target: Window;
  #sonarHeld = false;
  #sonarQueued = false;

  constructor(
    target: Window = window,
    readonly onReset: () => void = () => undefined,
  ) {
    this.#target = target;
    target.addEventListener('keydown', this.#onKeyDown);
    target.addEventListener('keyup', this.#onKeyUp);
    target.addEventListener('blur', this.#onBlur);
    target.document.addEventListener('focusin', this.#onFocus);
    target.document.addEventListener('visibilitychange', this.#onVisibility);
  }

  movement(): Vector2 {
    return {
      x:
        Number(this.#pressed.has('KeyD') || this.#pressed.has('ArrowRight')) -
        Number(this.#pressed.has('KeyA') || this.#pressed.has('ArrowLeft')),
      y:
        Number(this.#pressed.has('KeyS') || this.#pressed.has('ArrowDown')) -
        Number(this.#pressed.has('KeyW') || this.#pressed.has('ArrowUp')),
    };
  }

  running(): boolean {
    return this.#pressed.has('ShiftLeft') || this.#pressed.has('ShiftRight');
  }

  reset(): void {
    this.#pressed.clear();
    this.#sonarHeld = false;
    this.#sonarQueued = false;
    this.onReset();
  }

  consumeSonarTrigger(): boolean {
    const queued = this.#sonarQueued;
    this.#sonarQueued = false;
    return queued;
  }

  destroy(): void {
    this.#target.removeEventListener('keydown', this.#onKeyDown);
    this.#target.removeEventListener('keyup', this.#onKeyUp);
    this.#target.removeEventListener('blur', this.#onBlur);
    this.#target.document.removeEventListener('focusin', this.#onFocus);
    this.#target.document.removeEventListener('visibilitychange', this.#onVisibility);
    this.reset();
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (gameplayInputBlocked() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') {
      event.preventDefault();
      if (!this.#sonarHeld) this.#sonarQueued = true;
      this.#sonarHeld = true;
      return;
    }
    if (!MOVEMENT_CODES.has(event.code)) return;
    event.preventDefault();
    this.#pressed.add(event.code);
  };

  readonly #onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      if (!gameplayInputBlocked()) event.preventDefault();
      this.#sonarHeld = false;
      return;
    }
    if (!MOVEMENT_CODES.has(event.code)) return;
    if (!gameplayInputBlocked()) event.preventDefault();
    this.#pressed.delete(event.code);
  };

  readonly #onBlur = (): void => {
    this.reset();
  };

  readonly #onFocus = (): void => {
    if (gameplayInputBlocked()) this.reset();
  };

  readonly #onVisibility = (): void => {
    if (this.#target.document.hidden) this.reset();
  };
}
