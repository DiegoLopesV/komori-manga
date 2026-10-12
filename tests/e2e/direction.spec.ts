import { test, expect } from '@playwright/test';
test('professional authoring keeps tools stable and offers dialogue direction and transition lettering', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.locator('.editor-paper [data-kind="panel"]').first().click();
  await expect(page.getByRole('button', { name: 'Onomatopeia', exact: true })).toBeVisible();
  await expect(
    page
      .locator('.right-sidebar')
      .getByRole('button', { name: 'Duplicar', exact: true, includeHidden: true }),
  ).toHaveCount(0);
  await page.locator('input[data-import="voice"]').setInputFiles('public/demo/chime.wav');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Balão', exact: true }).click();
    if (!(await page.getByRole('combobox', { name: 'Falas', exact: true }).isVisible()))
      await page
        .locator('.right-sidebar summary')
        .filter({ hasText: /^Áudio$/ })
        .click();
    await page
      .getByRole('combobox', { name: 'Falas', exact: true })
      .selectOption({ label: 'chime.wav' });
    if (i === 0) await page.locator('.editor-paper [data-kind="panel"]').first().click();
  }
  const bubbles = page.locator('.editor-paper [data-kind="bubble"]');
  expect(await bubbles.nth(0).getAttribute('transform')).not.toBe(
    await bubbles.nth(1).getAttribute('transform'),
  );
  await page.getByRole('button', { name: 'Ordem, volume e disparo', exact: true }).click();
  await expect(page.locator('.cue-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Subir fala Balão 2', exact: true }).click();
  await expect(page.locator('.cue-row').first()).toContainText('Balão 2');
  await page.getByLabel('Volume Balão 2', { exact: true }).press('Home');
  for (let i = 0; i < 8; i++)
    await page.getByLabel('Volume Balão 2', { exact: true }).press('ArrowRight');
  await page.getByLabel('Pausa antes Balão 2 (ms)', { exact: true }).fill('120');
  await page.getByRole('button', { name: 'Novo momento', exact: true }).click();
  await expect(
    page
      .locator('.right-sidebar')
      .getByRole('combobox', { name: 'Falas', exact: true, includeHidden: true }),
  ).toHaveCount(0);
  await page.locator('.timeline-heading summary').click();
  await page.getByRole('button', { name: 'Transição com onomatopeia', exact: true }).click();
  await expect(page.getByLabel('Somente durante a transição')).toBeChecked();
  await page.getByRole('button', { name: 'Testar leitura', exact: true }).click();
  await expect(page.locator('.reader-page [data-kind="sfx"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect(page.locator('.reader-page [data-kind="sfx"]')).toHaveCount(1);
  await expect(page.locator('.reader-page [data-kind="sfx"]')).toHaveCount(0, { timeout: 3000 });
});

test('layer actions lock dragging and moment deletion preserves content with confirmation and undo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  const panel = page.locator('.editor-paper [data-kind="panel"]').first();
  await page.getByRole('button', { name: 'Camadas', exact: true }).click();
  const row = page.locator('.layer-row').first();
  await row.locator('summary').click();
  await row.getByRole('button', { name: 'Bloquear arraste', exact: true }).click();
  const before = await panel.getAttribute('transform');
  const box = (await panel.boundingBox())!;
  await page.mouse.move(box.x + 25, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(box.x + 75, box.y + 75);
  await page.mouse.up();
  expect(await panel.getAttribute('transform')).toBe(before);
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  await page.locator('.moment-card').last().click();
  await page.locator('.right-sidebar summary').filter({ hasText: 'Ações do momento' }).click();
  await page.locator('.moment-properties .button-row button').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.moment-card')).toHaveCount(5);
  await page.locator('.moment-properties .button-row button').last().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remover momento', exact: true })
    .click();
  await expect(page.locator('.moment-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'Testar leitura', exact: true }).click();
  await expect(page.locator('.reader-page [data-kind="panel"]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.locator('.moment-card')).toHaveCount(5);
});

test('idle first click plays the current speech; repeated files queue and gain/order survive reopening', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__audio = [];
    HTMLMediaElement.prototype.play = function () {
      (window as any).__audio.push(this);
      return Promise.resolve();
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.locator('.editor-paper [data-kind="panel"]').first().click();
  await page.locator('input[data-import="voice"]').setInputFiles('public/demo/chime.wav');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Balão', exact: true }).click();
    if (!(await page.getByRole('combobox', { name: 'Falas', exact: true }).isVisible()))
      await page
        .locator('.right-sidebar summary')
        .filter({ hasText: /^Áudio$/ })
        .click();
    await page
      .getByRole('combobox', { name: 'Falas', exact: true })
      .selectOption({ label: 'chime.wav' });
  }
  await page.getByRole('button', { name: 'Ordem, volume e disparo', exact: true }).click();
  await page.getByRole('button', { name: 'Subir fala Balão 2', exact: true }).click();
  await page.getByLabel('Volume Balão 2', { exact: true }).press('Home');
  for (let i = 0; i < 8; i++)
    await page.getByLabel('Volume Balão 2', { exact: true }).press('ArrowRight');
  await page.getByRole('button', { name: 'Testar este momento', exact: true }).click();
  await expect(page.locator('.reader-page .reveal-fade')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__audio.length)).toBe(0);
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__audio.length)).toBe(1);
  expect(await page.evaluate(() => (window as any).__audio[0].volume)).toBeCloseTo(0.32);
  await expect(page.locator('.reader-navigation span')).toHaveText('1 / 4');
  await page.evaluate(() => (window as any).__audio[0].dispatchEvent(new Event('ended')));
  await expect.poll(() => page.evaluate(() => (window as any).__audio.length)).toBe(2);
  expect(await page.evaluate(() => (window as any).__audio[1].volume)).toBeCloseTo(0.8);
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await page
    .locator('.reader-overlay')
    .getByRole('button', { name: 'Voltar', exact: true })
    .click();
  expect(await page.evaluate(() => (window as any).__audio.length)).toBe(2);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.reload();
  await page.locator('.work-card').filter({ hasText: 'Sem título' }).click();
  await page
    .locator('.right-sidebar summary')
    .filter({ hasText: 'Falas e efeitos deste momento' })
    .click();
  await expect(page.locator('.cue-row').first()).toContainText('Balão 2');
  await expect(page.getByLabel('Volume Balão 2', { exact: true })).toHaveValue('0.4');
});
