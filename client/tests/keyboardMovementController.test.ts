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

  it('queues one sonar trigger per Space press', () => {
    controller = new KeyboardMovementController(window);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(controller.consumeSonarTrigger()).toBe(true);
    expect(controller.consumeSonarTrigger()).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(controller.consumeSonarTrigger()).toBe(true);
  });
  it('leaves R unbound without queuing other gameplay actions', () => {
    controller = new KeyboardMovementController(window);
    const key = new KeyboardEvent('keydown', { code: 'KeyR', cancelable: true });
    window.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    expect(controller.consumeSonarTrigger()).toBe(false);
    expect(controller.movement()).toEqual({ x: 0, y: 0 });
    expect(controller.running()).toBe(false);
  });

  it('maps arrows and either Shift key without stacking equivalent bindings', () => {
    controller = new KeyboardMovementController(window);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftRight' }));
    expect(controller.movement()).toEqual({ x: 0, y: -1 });
    expect(controller.running()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftRight' }));
    expect(controller.running()).toBe(false);
  });

  it('clears held input and leaves text controls alone', () => {
    controller = new KeyboardMovementController(window);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(controller.movement()).toEqual({ x: 0, y: 0 });
    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    const release = new KeyboardEvent('keyup', { code: 'Space', bubbles: true, cancelable: true });
    input.dispatchEvent(release);
    expect(release.defaultPrevented).toBe(false);
    expect(controller.consumeSonarTrigger()).toBe(false);
    input.remove();
  });
});
