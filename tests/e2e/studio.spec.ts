import { test, expect } from '@playwright/test';
test('demo → editor → change title → preview → back → retained draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await expect(page.getByText('Depois da chuva').first()).toBeVisible();
  await page.getByRole('button', { name: 'Detalhes da obra', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Meu capítulo piloto');
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await page.getByRole('button', { name: 'Testar leitura' }).click();
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect(page.getByText('2 / 4')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).last().click();
  await expect(page.getByText('1 / 4')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Meu capítulo piloto')).toBeVisible();
});
test('new work supports curved frames, editable text, undo and moments', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  await page.getByLabel('Curvatura da borda 1 curve').fill('0.25');
  await expect(page.locator('svg path[d*="C"]')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Balão', exact: true }).click();
  await page.getByRole('textbox', { name: 'Texto', exact: true }).fill('Olá, mundo!');
  await expect(
    page.locator('.editor-paper .canvas-text').filter({ hasText: 'Olá, mundo!' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Novo momento', exact: true }).click();
  await expect(page.locator('.moment-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.locator('.moment-card')).toHaveCount(5);
});
test('English interface and mobile reader fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText('Stories that unfold.')).toBeVisible();
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Preview reading' }).click();
  await expect(page.locator('.reader-page')).toBeVisible();
  expect(
    await page.locator('.reader-overlay').evaluate((el) => el.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
