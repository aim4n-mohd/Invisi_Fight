import { expect, test, type Page } from '@playwright/test';

async function localPlayerX(page: Page): Promise<number> {
  const value = await page.locator('#game-frame').getAttribute('data-local-player-x');
  if (!value) throw new Error('Local player state was not rendered.');
  return Number(value);
}

test('two players can create, join, and start a private match', async ({ context, page: host }) => {
  test.setTimeout(120_000);
  await host.setViewportSize({ width: 1904, height: 884 });
  const guest = await context.newPage();
  await guest.setViewportSize({ width: 1904, height: 884 });

  await host.goto('./');
  await host.getByLabel('Display name').fill('Host');
  await host.getByRole('button', { name: 'Create room' }).click();
  await expect(host.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
  const roomHeading = await host.getByRole('heading', { name: /^Room [A-Z2-9]{6}$/ }).innerText();
  const roomCode = roomHeading.replace('Room ', '');

  await guest.goto('./');
  await guest.getByLabel('Display name').fill('Guest');
  await guest.getByLabel('Room code').fill(roomCode);
  await guest.getByRole('button', { name: 'Join room' }).click();
  await expect(guest.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
  await expect(host.getByText('Guest')).toBeVisible();

  const startButton = host.getByRole('button', { name: 'Start match' });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expect(host.getByRole('heading', { name: 'Stay unreadable' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Stay unreadable' })).toBeVisible();
  await Promise.all([
    expect(host.locator('canvas')).toBeVisible({ timeout: 20_000 }),
    expect(guest.locator('canvas')).toBeVisible({ timeout: 20_000 }),
  ]);

  const canvasBounds = await host.locator('canvas').boundingBox();
  expect(canvasBounds).not.toBeNull();
  expect(canvasBounds!.y + canvasBounds!.height).toBeLessThanOrEqual(884);

  await expect(host.locator('#game-frame')).toHaveAttribute(
    'data-local-player-x',
    /^\d+(?:\.\d+)?$/,
    { timeout: 10_000 },
  );
  const startingX = await localPlayerX(host);
  await host.keyboard.down('d');
  await host.waitForTimeout(600);
  await host.keyboard.up('d');
  await expect.poll(() => localPlayerX(host)).toBeGreaterThan(startingX + 40);

  const spectator = await context.newPage();
  await spectator.goto('./');
  await spectator.getByLabel('Display name').fill('Watcher');
  await spectator.getByLabel('Room code').fill(roomCode);
  await spectator.getByRole('button', { name: 'Join room' }).click();
  await expect(spectator.getByRole('heading', { name: 'You are spectating' })).toBeVisible();
  await expect(spectator.locator('canvas')).toBeVisible({ timeout: 20_000 });

  const hostCanvas = await host.locator('canvas').boundingBox();
  const guestCanvas = await guest.locator('canvas').boundingBox();
  expect(hostCanvas).not.toBeNull();
  expect(guestCanvas).not.toBeNull();
  await host.mouse.move(hostCanvas!.x + 10, hostCanvas!.y + hostCanvas!.height / 2);
  await guest.mouse.move(
    guestCanvas!.x + guestCanvas!.width - 10,
    guestCanvas!.y + guestCanvas!.height / 2,
  );

  await expect(host.getByText(/wins\.|You survived the dark\./)).toBeVisible({ timeout: 40_000 });
  await expect(guest.getByText(/wins\.|You survived the dark\./)).toBeVisible({ timeout: 40_000 });
  await host.getByRole('button', { name: 'Replay to lobby' }).click();
  await expect(host.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible();
});

test('keyboard users can create a room and receive focus on the next screen', async ({ page }) => {
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Move unseen. Scan carefully. Commit the shot.' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const nameInput = page.getByLabel('Display name');
  await expect(nameInput).toBeFocused();
  await nameInput.fill('KeyboardHost');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create room' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Waiting for the fight' })).toBeFocused();
});

test('a room host reconnects after refreshing the room URL', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('./');
  await page.getByLabel('Display name').fill('ReconnectHost');
  await page.getByRole('button', { name: 'Create room' }).click();

  const roomHeading = page.getByRole('heading', { name: /^Room [A-Z2-9]{6}$/ });
  const expectedRoomHeading = await roomHeading.innerText();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Waiting for the fight' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: expectedRoomHeading })).toBeVisible();
  await expect(page.getByText('ReconnectHost')).toBeVisible();
});

test('landing actions stack without horizontal overflow on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  const panels = page.locator('.landing-grid > .panel');
  const first = await panels.nth(0).boundingBox();
  const second = await panels.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);
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
