// Opt-in integration test against a disposable author in the configured project.
// Supply KOMORI_TEST_ADMIN_KEY through the process environment; never commit it.
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!process.env.KOMORI_TEST_ADMIN_KEY) throw new Error('KOMORI_TEST_ADMIN_KEY required');
const admin = createClient(url, process.env.KOMORI_TEST_ADMIN_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `komori-test-${Date.now()}@example.com`,
  password = randomBytes(24).toString('base64url');
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const userId = data.user.id;
let browser;
const paths = [];
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
  const failures = [];
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Começar uma obra' }).click();
  await page.getByRole('button', { name: 'Detalhes da obra', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Teste integrado Komori');
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png });
  await page.locator('.asset-card').waitFor();
  await page.locator('.asset-card').click();
  await page.getByRole('button', { name: 'Publicar capítulo atual', exact: true }).click();
  await page.getByText('Publicação pronta', { exact: true }).waitFor({ timeout: 30000 });
  const link = await page.getByLabel('Compartilhar obra').inputValue();
  const workId = link.split('/').at(-1);
  const { data: workRows } = await admin.from('works').select('draft').eq('id', workId);
  assert.equal(workRows[0].draft.title, 'Teste integrado Komori');
  paths.push(...workRows[0].draft.assets.filter((a) => a.path).map((a) => a.path));
  const anon = createClient(url, key, { auth: { persistSession: false } });
  assert.equal((await anon.from('works').select('*').eq('id', workId)).data.length, 0);
  assert.equal(
    (await anon.from('publications').select('snapshot').eq('work_id', workId)).data[0].snapshot
      .title,
    'Teste integrado Komori',
  );
  const readerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const reader = await readerContext.newPage();
  await reader.goto(link);
  await reader.getByRole('heading', { name: 'Teste integrado Komori' }).waitFor();
  await reader.getByRole('button', { name: 'Leitor', exact: true }).click();
  await reader.getByRole('button', { name: 'Avançar', exact: true }).click();
  await reader.getByRole('button', { name: 'Avançar', exact: true }).click();
  mkdirSync('test-results', { recursive: true });
  await reader.screenshot({ path: 'test-results/live-reader.png' });
  assert.equal(failures.length, 0);
  console.log(
    'PASS: real author login → private draft → storage upload → publication → anonymous mobile reader',
  );
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Detalhes da obra', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Rascunho alterado');
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await page.getByText('Salvo', { exact: true }).waitFor({ timeout: 15000 });
  assert.equal(
    (await anon.from('publications').select('snapshot').eq('work_id', workId)).data[0].snapshot
      .title,
    'Teste integrado Komori',
  );
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Rascunho alterado/ }).waitFor();
  console.log('PASS: edits stay private, cloud draft survives reload');
} finally {
  await browser?.close();
  // Only remove fixtures created by this test; revoke the test session first.
  await admin.auth.admin.signOut(userId, 'global').catch(() => {});
  await admin.from('published_assets').delete().eq('owner_id', userId);
  await admin.from('works').delete().eq('owner_id', userId);
  if (paths.length) await admin.storage.from('media').remove(paths);
  await admin.auth.admin.deleteUser(userId);
}
