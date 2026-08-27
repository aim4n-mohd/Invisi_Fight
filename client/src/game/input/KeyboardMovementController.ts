import type { Vector2 } from '@invisi-fight/shared';

const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

export class KeyboardMovementController {
  readonly #pressed = new Set<string>();
  readonly #target: Window;
  #sonarHeld = false;
  #sonarQueued = false;

  constructor(target: Window = window) {
    this.#target = target;
    target.addEventListener('keydown', this.#onKeyDown);
    target.addEventListener('keyup', this.#onKeyUp);
    target.addEventListener('blur', this.#onBlur);
  }

  movement(): Vector2 {
    return {
      x: Number(this.#pressed.has('KeyD')) - Number(this.#pressed.has('KeyA')),
      y: Number(this.#pressed.has('KeyS')) - Number(this.#pressed.has('KeyW')),
    };
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
    this.#pressed.clear();
    this.#sonarHeld = false;
    this.#sonarQueued = false;
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
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
      event.preventDefault();
      this.#sonarHeld = false;
      return;
    }
    if (!MOVEMENT_CODES.has(event.code)) return;
    event.preventDefault();
    this.#pressed.delete(event.code);
  };

  readonly #onBlur = (): void => {
    this.#pressed.clear();
    this.#sonarHeld = false;
    this.#sonarQueued = false;
  };
}
