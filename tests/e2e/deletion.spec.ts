import { test, expect } from '@playwright/test';
test('Delete removes a selected frame, cleans moments and can be undone', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  await expect(page.locator('.editor-paper circle')).toHaveCount(4);
  await page.locator('.editor-paper svg').click({ position: { x: 60, y: 60 } });
  await page.keyboard.press('Delete');
  await expect(page.locator('.editor-paper g>rect[stroke-dasharray]')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Revelar Quadro', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Revelar Quadro', exact: true })).toHaveCount(1);
});
test('Backspace inside text does not remove the selected element', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Balão', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Texto', exact: true });
  await text.fill('Teste');
  await text.press('Backspace');
  await expect(text).toHaveValue('Test');
  await expect(page.locator('.editor-paper .canvas-text')).toHaveCount(1);
});
test('work deletion can be cancelled and persists after confirmation and reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Apagar obra Sem título' }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.work-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Apagar obra Sem título' }).click();
  await page.getByRole('button', { name: 'Apagar definitivamente', exact: true }).click();
  await expect(page.locator('.work-card')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.work-card')).toHaveCount(0);
});
