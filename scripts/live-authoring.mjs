import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
process.loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!process.env.KOMORI_TEST_ADMIN_KEY) throw new Error('KOMORI_TEST_ADMIN_KEY required');
const admin = createClient(url, process.env.KOMORI_TEST_ADMIN_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `komori-authoring-${Date.now()}@example.com`,
  password = randomBytes(24).toString('base64url');
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const userId = data.user.id;
let browser;
const paths = [];
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    page = await context.newPage();
  const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Detalhes da obra', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Teste SVG integrado');
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await page
    .locator('input[data-import="page"]')
    .setInputFiles(process.env.KOMORI_SVG_FIXTURE || 'tests/fixtures/layout.svg');
  await page.locator('.editor-paper [data-kind="panel"]').nth(3).waitFor();
  assert.equal(await page.locator('.editor-paper [data-kind="panel"]').count(), 4);
  // Remove the untouched placeholder page, preserving the imported SVG page.
  await page.locator('.page-thumb').first().click();
  await page.getByRole('button', { name: 'Apagar página', exact: true }).click();
  await page.getByRole('button', { name: 'Remover página', exact: true }).click();
  await page.locator('.editor-paper [data-kind="panel"]').first().click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .locator('input[data-import="art"]')
    .setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: png });
  await page.locator('.editor-paper image').waitFor();
  await page.locator('input[data-import="voice"]').setInputFiles('public/demo/chime.wav');
  await page
    .locator('.moment-properties')
    .getByRole('combobox', { name: 'Falas', exact: true })
    .locator('option')
    .nth(1)
    .waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Salvar como modelo', exact: true }).click();
  await page.getByLabel('Nome do modelo').fill('Quadro SVG pessoal');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByLabel('Nome do modelo').waitFor({ state: 'detached' });
  assert.equal(
    (await admin.from('element_templates').select('definition').eq('owner_id', userId)).data[0]
      .definition.name,
    'Quadro SVG pessoal',
  );
  await page.getByRole('button', { name: 'Balão neste quadro', exact: true }).click();
  await page.getByRole('textbox', { name: 'Texto', exact: true }).fill('Fala do quadro.');
  await page.getByRole('button', { name: 'Publicar capítulo atual', exact: true }).click();
  await page.getByText('Publicação pronta', { exact: true }).waitFor({ timeout: 30000 });
  const link = await page.getByLabel('Compartilhar obra').inputValue(),
    workId = link.split('/').at(-1);
  const { data: rows } = await admin.from('works').select('draft').eq('id', workId);
  paths.push(...rows[0].draft.assets.filter((a) => a.path).map((a) => a.path));
  const anon = createClient(url, key, { auth: { persistSession: false } }),
    snapshot = (await anon.from('publications').select('snapshot').eq('work_id', workId)).data[0]
      .snapshot;
  assert.equal(snapshot.chapters[0].pages[0].elements.filter((e) => e.kind === 'panel').length, 4);
  assert.ok(snapshot.chapters[0].pages[0].elements.find((e) => e.kind === 'bubble').parentId);
  assert.ok(snapshot.chapters[0].pages[0].moments[0].voiceId);
  const readerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    reader = await readerContext.newPage();
  await reader.goto(link);
  await reader.getByRole('button', { name: 'Leitor', exact: true }).click();
  await reader.locator('.reader-page .canvas-text').waitFor();
  assert.equal(await reader.locator('.reader-page .canvas-text').innerText(), 'Fala do quadro.');
  assert.equal(failures.length, 0);
  mkdirSync('test-results', { recursive: true });
  await reader.screenshot({ path: 'test-results/svg-public-reader.png' });
  console.log(
    'PASS: SVG → native panels → art/voice uploads → linked bubble → private cloud preset → anonymous published reader',
  );
} finally {
  await browser?.close();
  const { data: works } = await admin.from('works').select('id,draft').eq('owner_id', userId);
  for (const work of works ?? [])
    paths.push(...work.draft.assets.filter((a) => a.path).map((a) => a.path));
  await admin.from('published_assets').delete().eq('owner_id', userId);
  await admin.from('works').delete().eq('owner_id', userId);
  if (paths.length) await admin.storage.from('media').remove([...new Set(paths)]);
  await admin.auth.admin.deleteUser(userId);
}
