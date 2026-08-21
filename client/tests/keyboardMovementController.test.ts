import { afterEach, describe, expect, it } from 'vitest';
import { KeyboardMovementController } from '../src/game/input/KeyboardMovementController.js';

describe('KeyboardMovementController', () => {
  let controller: KeyboardMovementController | undefined;

  afterEach(() => controller?.destroy());

  it('tracks held WASD keys until their matching keyup event', () => {
    controller = new KeyboardMovementController(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(controller.movement()).toEqual({ x: 1, y: -1 });

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(controller.movement()).toEqual({ x: 1, y: 0 });
  });

  it('clears movement when the browser loses focus', () => {
    controller = new KeyboardMovementController(window);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    window.dispatchEvent(new Event('blur'));
    expect(controller.movement()).toEqual({ x: 0, y: 0 });
  });
});
