import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingScreen } from '../src/app/screens/LandingScreen.js';
vi.mock('../src/game-three/LandingAttract.js', () => ({
  LandingAttract: class {
    destroy() {}
  },
}));

describe('LandingScreen', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps the entry flow compact and limited to essential game copy', () => {
    const screen = LandingScreen();
    document.body.append(screen);

    expect(screen.querySelector('h1')?.textContent).toBe('INVISI FIGHT');
    expect(screen.querySelector('.screen__lede')).toBeNull();
    expect(screen.querySelector('select')).toBeNull();
    const echo = screen.querySelector<HTMLButtonElement>('[data-mode="echo_hunt"]')!;
    const classic = screen.querySelector<HTMLButtonElement>('[data-mode="classic"]')!;
    expect(echo.getAttribute('aria-pressed')).toBe('true');
    expect(classic.getAttribute('aria-pressed')).toBe('false');
    classic.click();
    expect(classic.getAttribute('aria-pressed')).toBe('true');
    expect(echo.getAttribute('aria-pressed')).toBe('false');
    expect(screen.querySelectorAll('input')).toHaveLength(2);
    expect([...screen.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
      'Echo Hunt',
      'Classic',
      'Create room',
      'Join room',
      'Settings',
    ]);
    expect(screen.textContent).not.toContain('Choose your fighter name');
    expect(screen.textContent).not.toContain('Start a fresh private room');
  });
});
