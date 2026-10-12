import { test, expect } from '@playwright/test';
test('SVG page becomes native frames; artwork and dialogue can be imported directly into a frame', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.locator('input[data-import="page"]').setInputFiles('tests/fixtures/layout.svg');
  await expect(page.locator('.editor-paper [data-kind="panel"]')).toHaveCount(4);
  await expect(page.getByText('708 × 1000')).toBeVisible();
  await page.locator('.editor-paper [data-kind="panel"]').first().click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .locator('input[data-import="art"]')
    .setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.editor-paper image')).toHaveCount(1);
  await page.getByRole('button', { name: 'Balão neste quadro', exact: true }).click();
  await expect(page.getByLabel('Vinculado ao quadro/conjunto')).not.toHaveValue('');
  await page.getByRole('textbox', { name: 'Texto', exact: true }).fill('Uma fala vinculada.');
  await page.getByRole('button', { name: 'Testar leitura' }).click();
  await expect(page.locator('.reader-page .canvas-text')).toHaveText('Uma fala vinculada.');
});
test('imported PNG image is selectable, resizable and removable; pages can be deleted and undone', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .locator('input[data-import="image"]')
    .setInputFiles({ name: 'page.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.editor-paper [data-kind="image"]')).toHaveCount(1);
  await page.getByRole('spinbutton', { name: 'Largura', exact: true }).fill('600');
  await expect(page.getByRole('spinbutton', { name: 'Largura', exact: true })).toHaveValue('600');
  await page.getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.locator('.editor-paper image')).toHaveCount(0);
  await page.getByRole('button', { name: 'Adicionar página', exact: true }).click();
  await expect(page.locator('.page-thumb')).toHaveCount(2);
  await page.getByRole('button', { name: 'Apagar página', exact: true }).click();
  await page.getByRole('button', { name: 'Remover página', exact: true }).click();
  await expect(page.locator('.page-thumb')).toHaveCount(1);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.locator('.page-thumb')).toHaveCount(2);
});
test('custom shapes are saved as personal presets and remain after reload in another work', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher formato', exact: true }).click();
  await page.getByRole('button', { name: 'Triangular', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar como modelo', exact: true }).click();
  await page.getByLabel('Nome do modelo').fill('Meu triângulo');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Modelos de elementos', exact: true }).click();
  await page.getByRole('button', { name: 'Meu triângulo', exact: true }).click();
  await expect(page.locator('.editor-paper circle')).toHaveCount(3);
});
test('frame audio imports attach to its reveal and linked balloons follow resizing', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  const panelId = await page
    .locator('.editor-paper [data-kind="panel"]')
    .last()
    .getAttribute('data-element-id');
  await page.locator('input[data-import="voice"]').setInputFiles('public/demo/chime.wav');
  await page.locator('input[data-import="sfx"]').setInputFiles('public/demo/chime.wav');
  await page.locator('input[data-import="music"]').setInputFiles('public/demo/ambience.wav');
  await expect(
    page.locator('.moment-properties').getByRole('combobox', { name: 'Falas', exact: true }),
  ).not.toHaveValue('');
  await expect(
    page.locator('.moment-properties').getByRole('combobox', { name: 'Efeitos', exact: true }),
  ).not.toHaveValue('');
  await expect(
    page
      .locator('.moment-properties')
      .getByRole('combobox', { name: 'Música ambiente', exact: true }),
  ).not.toHaveValue('');
  await page.getByRole('button', { name: 'Balão neste quadro', exact: true }).click();
  const before = await page.locator('.editor-paper [data-kind="bubble"]').getAttribute('transform');
  await page
    .locator(`.editor-paper [data-element-id="${panelId}"]`)
    .click({ position: { x: 15, y: 15 } });
  await page.getByRole('spinbutton', { name: 'Largura', exact: true }).fill('600');
  expect(
    await page.locator('.editor-paper [data-kind="bubble"]').getAttribute('transform'),
  ).not.toBe(before);
  await page.getByRole('button', { name: 'Testar leitura' }).click();
  await page.locator('.reader-controls summary').click();
  await page.getByLabel('Reduzir movimento').check();
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect(page.locator('.reader-page [data-kind="bubble"]')).toHaveCount(1);
});
test('SVG resize handle stays usable above overlapping frames', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.locator('input[data-import="page"]').setInputFiles('tests/fixtures/layout.svg');
  const panel = page.locator('.editor-paper [data-kind="panel"]').first();
  await panel.click();
  const before = (await panel.boundingBox())!.width;
  const handle = (await page.locator('.editor-paper [data-resize-handle]').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 45, handle.y + handle.height / 2 + 30);
  await page.mouse.up();
  expect((await panel.boundingBox())!.width).toBeGreaterThan(before + 20);
});

test('finished page has one SVG-only import button with an explanatory tooltip', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  const button = page.getByRole('button', { name: 'Importar página pronta', exact: true });
  await expect(button).toHaveAttribute(
    'title',
    'Importe uma página em SVG para editar seus quadros e elementos.',
  );
  await expect(
    page.getByRole('button', { name: 'Importar SVG editável', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('input[data-import="page"]')).toHaveAttribute(
    'accept',
    'image/svg+xml,.svg',
  );
});
