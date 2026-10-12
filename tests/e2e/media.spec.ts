import { test, expect } from '@playwright/test';
test('imported animation plays, reduced motion uses its static alternative', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await page.getByRole('button', { name: 'Testar leitura' }).click();
  const video = page.locator('.reader-page video');
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.locator('.reader-controls summary').click();
  await page.getByLabel('Reduzir movimento').check();
  await expect(video).toHaveCount(0);
  await expect(page.locator('.reader-page img')).toBeVisible();
});
test('finished-page import maps artwork to frames and remains available after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'page.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.editor-paper image')).toHaveCount(5);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.reload();
  await page.locator('.work-card').filter({ hasText: 'Sem título' }).click();
  await expect(page.locator('.editor-paper image')).toHaveCount(5);
});
