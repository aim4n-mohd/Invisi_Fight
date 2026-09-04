import { expect, test, type Page } from '@playwright/test';
import { Vector3 } from 'three';
import { CameraController } from '../src/game-three/camera/CameraController.js';
import { simulationToWorld } from '../src/game-three/math/coordinates.js';

async function enter(page: Page, name: string, code?: string): Promise<void> {
  await page.goto('./');
  await page.getByLabel('Fighter name').fill(name);
  if (code) await page.getByLabel('Room code').fill(code);
  await page.getByRole('button', { name: code ? 'Join room' : 'Create room', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Echo Hunt controls' })).toBeVisible();
  await page.getByRole('button', { name: 'Close controls and enter arena' }).click();
  await expect(page.locator('.echo-screen canvas')).toBeVisible({ timeout: 20_000 });
}

async function aimAtKnownSpawn(
  page: Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  const canvas = (await page.locator('.echo-screen canvas').boundingBox())!;
  const hud = (await page.locator('.echo-hud').boundingBox())!;
  const header = (await page.locator('.echo-topbar').boundingBox())!;
  const camera = new CameraController();
  camera.resize(canvas.width, canvas.height, hud.height, header.height, true);
  const world = simulationToWorld({ x, y });
  const projected = new Vector3(world.x, world.y, world.z).project(camera.camera);
  return {
    x: canvas.x + ((projected.x + 1) * canvas.width) / 2,
    y: canvas.y + ((1 - projected.y) * canvas.height) / 2,
  };
}

test('@echo practice, countdown, elimination, spectator and opt-in rematch retain one canvas', async ({
  page: host,
  context,
}) => {
  test.setTimeout(70_000);
  await host.setViewportSize({ width: 1366, height: 768 });
  await host.route('**/healthz', (route) => route.abort('failed'));
  await enter(host, 'EchoHost');
  const frame = host.locator('.echo-screen .game-frame');
  await expect(frame).toHaveAttribute('data-phase', 'lobby');
  await expect(frame).toHaveAttribute('data-local-player-x', /^\d/);
  const originalCanvas = await host.locator('.echo-screen canvas').elementHandle();
  const roomText = await host.locator('.echo-room-code').innerText();
  const code = /Room ([A-Z2-9]{6})/.exec(roomText)![1]!;
  const practicePoint = await aimAtKnownSpawn(host, 900, 300);
  await host.mouse.click(practicePoint.x, practicePoint.y);
  await expect(host.locator('.echo-hearts')).toHaveAttribute('aria-label', '3 hearts');

  const guest = await context.newPage();
  await guest.setViewportSize({ width: 1366, height: 768 });
  await guest.goto(`./?room=${code}&mode=echo_hunt`);
  await expect(guest.getByLabel('Room code')).toHaveValue(code);
  await guest.getByLabel('Fighter name').fill('EchoGuest');
  await guest.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(frame).toHaveAttribute('data-phase', 'lobby');
  await guest.getByRole('button', { name: 'Close controls and enter arena' }).click();
  await expect(frame).toHaveAttribute('data-phase', 'countdown');
  await expect(frame).toHaveAttribute('data-phase', 'echo_hunt', { timeout: 10_000 });
  await expect(guest.locator('.echo-screen .game-frame')).toHaveAttribute(
    'data-local-player-x',
    /^\d/,
  );

  const spectator = await context.newPage();
  await enter(spectator, 'EchoWatcher', code);
  const spectatorFrame = spectator.locator('.echo-screen .game-frame');
  await expect(spectator.locator('.echo-hearts')).toHaveText('Spectating');
  await expect(spectatorFrame).not.toHaveAttribute('data-local-player-x', /.+/);
  await expect(spectatorFrame).toHaveAttribute('data-private-detections', '0');

  const target = await aimAtKnownSpawn(host, 480, 460);
  for (const hearts of [2, 1, 0]) {
    await expect(host.locator('.echo-card--bullet')).toHaveAttribute('data-ready', 'true');
    await host.mouse.click(target.x, target.y);
    if (hearts)
      await expect(guest.locator('.echo-hearts')).toHaveAttribute('aria-label', `${hearts} hearts`);
  }
  await expect(frame).toHaveAttribute('data-phase', 'results');
  await expect(guest.locator('.echo-hearts')).toHaveText('Spectating');
  expect(await originalCanvas!.evaluate((canvas) => canvas.isConnected)).toBe(true);
  await expect(host.locator('.echo-results')).toContainText('3/3 hits');
  await host.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(frame).toHaveAttribute('data-phase', 'results');
  await spectator.getByRole('button', { name: 'Join next match', exact: true }).click();
  await expect(frame).toHaveAttribute('data-phase', 'countdown');
  await expect(frame).toHaveAttribute('data-phase', 'echo_hunt', { timeout: 10_000 });
  await expect(spectator.locator('.echo-hearts')).toHaveAttribute('aria-label', '3 hearts');
  await expect(guest.locator('.echo-hearts')).toHaveText('Spectating');
  expect(await originalCanvas!.evaluate((canvas) => canvas.isConnected)).toBe(true);
  await host.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(host.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await host.getByRole('button', { name: 'Close settings' }).click();
  await expect(host.locator('.echo-screen canvas')).toBeVisible();
});

test('@echo three-round HUD uses icons and automatic-only reload without replacing the canvas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await enter(page, 'AmmoCheck');
  await expect(page.locator('.echo-screen .game-frame')).toHaveAttribute(
    'data-local-player-x',
    /^\d/,
  );
  await expect(page.locator('.echo-status')).toHaveText('Waiting for players: free practice');
  const canvas = await page.locator('.echo-screen canvas').elementHandle();
  const target = await aimAtKnownSpawn(page, 480, 300);
  await page.mouse.click(target.x, target.y);
  await expect(page.locator('.echo-ammo')).toHaveAttribute('aria-label', '2 of 3 bullets');
  await page.keyboard.press('r');
  await expect(page.getByRole('progressbar', { name: 'Reload progress' })).toBeHidden();
  await expect(page.locator('.echo-ammo')).toHaveAttribute('aria-label', '2 of 3 bullets');
  await expect(page.locator('.echo-ammo')).toHaveText('');
  await expect(page.locator('.echo-ammo svg')).toHaveCount(3);
  await expect(page.locator('.echo-card--bullet')).not.toContainText(/LMB|Reload|3\s*\/\s*3/);
  await expect(page.getByRole('button', { name: /reload/i })).toHaveCount(0);
  for (const ammo of [1, 0]) {
    await expect(page.locator('.echo-card--bullet')).toHaveAttribute('data-ready', 'true');
    await page.mouse.click(target.x, target.y);
    await expect(page.locator('.echo-ammo')).toHaveAttribute(
      'aria-label',
      `${ammo} of 3 bullets${ammo === 0 ? ', reloading' : ''}`,
    );
  }
  await expect(page.locator('.echo-ammo')).toHaveAttribute('aria-label', '3 of 3 bullets');
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  const sharing = (await page.locator('.echo-share-panel').boundingBox())!;
  const room = (await page.locator('.echo-room-panel').boundingBox())!;
  const hud = (await page.locator('.echo-hud').boundingBox())!;
  expect(sharing.x).toBeGreaterThan(room.x + room.width);
  expect(room.y + room.height).toBeLessThan(hud.y);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        // WebKit rounds root scrollWidth up and innerWidth down at fractional
        // CSS viewport sizes (trace: 341 vs 340, with no overflowing controls).
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        viewport: innerWidth,
        root: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll<HTMLElement>('.echo-topbar *, .echo-hud *'))
          .filter((node) => node.getBoundingClientRect().right > innerWidth)
          .map((node) => ({
            className: node.className,
            right: node.getBoundingClientRect().right,
          })),
      })),
    )
    .toMatchObject({ overflow: false, offenders: [] });
});
