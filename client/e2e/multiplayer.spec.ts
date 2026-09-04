import { expect, test, type Page } from '@playwright/test';

async function localPlayerX(page: Page): Promise<number> {
  const value = await page.locator('#game-frame').getAttribute('data-local-player-x');
  if (!value) throw new Error('Local player state was not rendered.');
  return Number(value);
}

test('@classic two players complete the readable v2 loop with sonar, locks, spectator, and replay', async ({
  context,
  page: host,
}) => {
  test.setTimeout(120_000);
  await host.setViewportSize({ width: 1904, height: 884 });
  const guest = await context.newPage();
  await guest.setViewportSize({ width: 1904, height: 884 });

  await host.goto('./');
  await host.getByLabel('Fighter name').fill('Host');
  await host.getByRole('button', { name: 'Classic', exact: true }).click();
  await host.getByRole('button', { name: 'Create room' }).click();
  await host.getByRole('button', { name: 'Close controls and enter arena' }).click();
  await expect(host.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
  const roomHeading = await host.getByRole('heading', { name: /^Room [A-Z2-9]{6}$/ }).innerText();
  const roomCode = roomHeading.replace('Room ', '');

  await guest.goto('./');
  await guest.getByLabel('Fighter name').fill('Guest');
  await guest.getByLabel('Room code').fill(roomCode);
  await guest.getByRole('button', { name: 'Classic', exact: true }).click();
  await guest.getByRole('button', { name: 'Join room' }).click();
  await guest.getByRole('button', { name: 'Close controls and enter arena' }).click();
  await expect(guest.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
  await expect(host.getByText('Guest')).toBeVisible();

  const startButton = host.getByRole('button', { name: 'Start match' });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expect(host.getByRole('heading', { name: 'Invisi Fight' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Invisi Fight' })).toBeVisible();
  await Promise.all([
    expect(host.locator('canvas')).toBeVisible({ timeout: 20_000 }),
    expect(guest.locator('canvas')).toBeVisible({ timeout: 20_000 }),
  ]);
  // Keep unattended automatic shots harmless during renderer/sonar setup.
  // The deliberate duel is aimed horizontally only after the spectator is ready.
  const setupGuestCanvas = (await guest.locator('canvas').boundingBox())!;
  await guest.mouse.move(setupGuestCanvas.x + setupGuestCanvas.width / 2, setupGuestCanvas.y + 5);
  await expect(host.locator('#game-frame')).toHaveAttribute('data-renderer', 'three');
  await expect(host.locator('#game-frame')).toHaveAttribute('data-camera-mode', 'orthographic');
  const observedHuntSeconds = Number(await host.locator('.countdown__value').textContent());
  expect(observedHuntSeconds).toBeGreaterThan(0);
  expect(observedHuntSeconds).toBeLessThanOrEqual(15);
  await expect(host.locator('.heart-meter__heart')).toHaveCount(2);
  await expect(host.locator('.action-panel')).toContainText('Ready');

  const canvasBounds = await host.locator('canvas').boundingBox();
  expect(canvasBounds).not.toBeNull();
  expect(canvasBounds!.y + canvasBounds!.height).toBeLessThanOrEqual(884);

  await expect(host.locator('#game-frame')).toHaveAttribute(
    'data-local-player-x',
    /^\d+(?:\.\d+)?$/,
    { timeout: 10_000 },
  );
  const startingX = await localPlayerX(host);
  await host.keyboard.down('a');
  await host.waitForTimeout(300);
  await host.keyboard.up('a');
  await expect.poll(() => localPlayerX(host)).toBeLessThan(startingX - 20);

  await host.keyboard.press('Space');
  await expect(host.locator('.action-panel')).toHaveAttribute('data-ready', 'false');
  await Promise.all([
    expect(host.locator('#game-frame')).toHaveAttribute('data-private-detections', '1'),
    expect(guest.locator('#game-frame')).toHaveAttribute('data-public-sonar-emission-count', '1'),
  ]);
  await host.waitForTimeout(3_100);
  await expect(host.locator('#game-frame')).toHaveAttribute('data-phase', 'hunt');
  await host.keyboard.press('Space');
  await expect(guest.locator('#game-frame')).toHaveAttribute(
    'data-public-sonar-emission-count',
    '2',
  );

  await expect(host.locator('#game-frame')).toHaveAttribute(
    'data-three-nonblank-samples',
    /^\d+$/,
    { timeout: 10_000 },
  );
  expect(
    Number(await host.locator('#game-frame').getAttribute('data-three-nonblank-samples')),
  ).toBeGreaterThan(0);
  await host.mouse.move(
    canvasBounds!.x + canvasBounds!.width - 20,
    canvasBounds!.y + canvasBounds!.height / 2,
  );
  await expect(host.locator('#game-frame')).toHaveAttribute('data-local-gun-angle', /^-?\d+\.\d+$/);
  const rightAim = Number(await host.locator('#game-frame').getAttribute('data-local-gun-angle'));
  await host.mouse.move(canvasBounds!.x + 20, canvasBounds!.y + canvasBounds!.height / 2);
  await expect
    .poll(async () =>
      Number(await host.locator('#game-frame').getAttribute('data-local-gun-angle')),
    )
    .not.toBeCloseTo(rightAim, 1);
  await host.mouse.move(canvasBounds!.x + canvasBounds!.width / 2, canvasBounds!.y + 5);

  const spectator = await context.newPage();
  await spectator.goto('./');
  await spectator.getByLabel('Fighter name').fill('Watcher');
  await spectator.getByLabel('Room code').fill(roomCode);
  await spectator.getByRole('button', { name: 'Classic', exact: true }).click();
  await spectator.getByRole('button', { name: 'Join room' }).click();
  await spectator.getByRole('button', { name: 'Close controls and enter arena' }).click();
  await expect(spectator.locator('.match-hud--spectator')).toBeVisible();
  await expect(spectator.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await expect(spectator.locator('#game-frame')).toHaveAttribute('data-private-detections', '0');

  // Observe auto-lock in the first resolution we can inspect. Waiting until a
  // later, lethal round makes this transient field disappear with the canvas.
  await expect(guest.locator('#game-frame')).toHaveAttribute('data-lock-source', 'automatic', {
    timeout: 20_000,
  });

  const hostCanvas = await host.locator('canvas').boundingBox();
  const guestCanvas = await guest.locator('canvas').boundingBox();
  expect(hostCanvas).not.toBeNull();
  expect(guestCanvas).not.toBeNull();
  await host.mouse.move(hostCanvas!.x + 10, hostCanvas!.y + hostCanvas!.height / 2);
  await guest.mouse.move(
    guestCanvas!.x + guestCanvas!.width - 10,
    guestCanvas!.y + guestCanvas!.height / 2,
  );

  // Spectator WebGL startup can finish near the end of Commit. Observe a fresh
  // Hunt → Commit boundary so the click tests locking, not an expired phase.
  await expect(host.locator('#game-frame')).toHaveAttribute('data-phase', 'hunt', {
    timeout: 15_000,
  });
  await expect(host.locator('.phase-label--commit')).toBeVisible({ timeout: 20_000 });
  await host.mouse.click(hostCanvas!.x + 10, hostCanvas!.y + hostCanvas!.height / 2);
  await expect(host.locator('.action-panel')).toHaveAttribute('data-lock-state', 'explicit');
  await expect(host.locator('.action-panel')).toContainText('Aim locked');

  await Promise.all([
    expect(host.locator('.phase-label--resolution')).toBeVisible({ timeout: 6_000 }),
    expect(host.locator('#game-frame')).toHaveAttribute('data-active-shooter-seen', 'true', {
      timeout: 6_000,
    }),
  ]);
  await expect(host.locator('html')).toHaveAttribute('data-recap-seen', 'true', {
    timeout: 8_000,
  });

  await expect(host.getByText(/wins\.|You survived the dark\./)).toBeVisible({ timeout: 60_000 });
  await expect(guest.getByText(/wins\.|You survived the dark\./)).toBeVisible({ timeout: 60_000 });
  await host.getByRole('button', { name: 'Replay to lobby' }).click();
  await expect(host.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
});

test('@classic keyboard users can create a room and receive focus on the next screen', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'INVISI FIGHT' })).toBeFocused();
  await page.keyboard.press('Tab');
  const nameInput = page.getByLabel('Fighter name');
  await expect(nameInput).toBeFocused();
  await nameInput.fill('KeyboardHost');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Echo Hunt', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Classic', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create room' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close controls and enter arena' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Waiting for the fight' })).toBeFocused();
});

test('@classic a room host reconnects after refreshing the room URL', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('./');
  await page.getByLabel('Fighter name').fill('ReconnectHost');
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  await page.getByRole('button', { name: 'Create room' }).click();
  await page.getByRole('button', { name: 'Close controls and enter arena' }).click();

  const roomHeading = page.getByRole('heading', { name: /^Room [A-Z2-9]{6}$/ });
  const expectedRoomHeading = await roomHeading.innerText();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: expectedRoomHeading })).toBeVisible();
  await expect(page.getByText('ReconnectHost')).toBeVisible();
});

test('@classic landing actions stack without horizontal overflow on a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  const nameInput = await page.getByLabel('Fighter name').boundingBox();
  const createButton = await page.getByRole('button', { name: 'Create room' }).boundingBox();
  const codeInput = await page.getByLabel('Room code').boundingBox();
  const joinButton = await page.getByRole('button', { name: 'Join room' }).boundingBox();
  expect(nameInput).not.toBeNull();
  expect(createButton).not.toBeNull();
  expect(codeInput).not.toBeNull();
  expect(joinButton).not.toBeNull();
  expect(createButton!.y).toBeGreaterThan(nameInput!.y + nameInput!.height);
  expect(joinButton!.y).toBeGreaterThan(codeInput!.y + codeInput!.height);
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>('*'))
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: element.getBoundingClientRect().right,
      }))
      .filter((entry) => entry.right > window.innerWidth + 0.5)
      .slice(0, 5),
  }));
  expect(overflow.offenders, JSON.stringify(overflow)).toHaveLength(0);
  expect(overflow.rootScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.innerWidth + 1,
  );
});
