import { afterEach, describe, expect, it } from 'vitest';
import { LandingScreen } from '../src/app/screens/LandingScreen.js';

describe('LandingScreen', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps the entry flow compact and limited to essential game copy', () => {
    const screen = LandingScreen();
    document.body.append(screen);

    expect(screen.querySelector('h1')?.textContent).toBe('INVISI FIGHT');
    expect(screen.querySelector('.screen__lede')?.textContent).toBe(
      'Move unseen. Ping to reveal your rival, then aim and fire.',
    );
    expect(screen.querySelectorAll('input')).toHaveLength(2);
    expect([...screen.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
      'Create room',
      'Join room',
    ]);
    expect(screen.textContent).not.toContain('Choose your fighter name');
    expect(screen.textContent).not.toContain('Start a fresh private room');
  });
});
