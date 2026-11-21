import { expect, test } from '@playwright/test';

test.describe('adicionar projeto pela interface (RF-01, RF-02)', () => {
  test('digitar uma pasta identifica os projetos dentro dela', async ({ page }) => {
    await page.goto('/projetos/adicionar');
    await page.getByLabel('Digite o caminho da pasta').fill('~/tests/fixtures');
    await page.getByRole('button', { name: 'Abrir' }).click();
    await page.getByRole('button', { name: 'Procurar projetos aqui' }).click();
    const lista = page.getByRole('list', { name: 'Projetos identificados' });
    await expect(lista).toBeVisible();
    await expect(lista).toContainText('Marketplace');
    await expect(lista).toContainText('projeto-sem-config');
    await expect(lista).toContainText('funcionalidades');
  });

  test('navega pelas pastas e mostra quais são projetos', async ({ page }) => {
    await page.goto('/projetos/adicionar');
    await page.getByLabel('Digite o caminho da pasta').fill('~/tests/fixtures');
    await page.getByRole('button', { name: 'Abrir' }).click();
    await expect(page.getByRole('button', { name: /marketplace/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /marketplace/ })).toContainText('projeto');
  });

  test('recusa caminho fora das pastas permitidas com mensagem clara', async ({ page }) => {
    await page.goto('/projetos/adicionar');
    await page.getByLabel('Digite o caminho da pasta').fill('/etc');
    await page.getByRole('button', { name: 'Abrir' }).click();
    await expect(page.getByRole('alert')).toContainText('fora das pastas permitidas');
  });
});

test.describe('remover projeto pela interface (RF-02)', () => {
  test('remover tira o card da lista sem recarregar a página', async ({ page, request }) => {
    // Registra um projeto extra só para este teste, para não remover o projeto dos outros testes.
    await request.post('/api/v1/projetos', { data: { caminho: '~/tests/fixtures/projeto-sem-config' } });
    await page.goto('/projetos');
    const lista = page.getByRole('list', { name: 'Projetos registrados' });
    const item = lista.getByRole('listitem').filter({ hasText: 'projeto-sem-config' });
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: 'Remover' }).click();
    await item.getByRole('button', { name: 'Confirmar remoção' }).click();
    await expect(lista.getByRole('listitem').filter({ hasText: 'projeto-sem-config' })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(lista).toContainText('Marketplace');
  });
});

test.describe('projetos registrados e estrutura (RF-03, RF-04)', () => {
  test('lista o projeto com stacks e leva à estrutura de funcionalidades e testes', async ({ page }) => {
    await page.goto('/projetos');
    await expect(page.getByRole('list', { name: 'Projetos registrados' })).toContainText('Marketplace');
    await page.getByRole('link', { name: 'Funcionalidades e testes' }).first().click();
    await expect(page.getByRole('heading', { name: 'Funcionalidades e testes BDD' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Checkout' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Java' }).first()).toBeVisible();
  });

  test('a estrutura mostra os erros de leitura do projeto', async ({ page, request }) => {
    const res = await request.get('/api/v1/projetos');
    const id = ((await res.json()) as { items: { id: string; nome: string }[] }).items.find((p) => p.nome === 'Marketplace')?.id;
    await page.goto(`/projetos/${id}/estrutura`);
    await expect(page.getByRole('heading', { name: 'Stacks identificadas' })).toBeVisible();
  });
});

test.describe('aviso de atualizações na pasta de testes (SHA-256)', () => {
  test('mostra o aviso quando a pasta muda e some ao marcar como visto', async ({ page, request }) => {
    const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const pasta = resolve('tests', `tmp-e2e-aviso-${Date.now()}`);
    const feature = join(pasta, 'features', 'a.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(feature, 'Feature: Aviso E2E\n  Scenario: um\n    Given algo\n');
      const reg = await request.post('/api/v1/projetos', { data: { caminho: pasta } });
      const id = ((await reg.json()) as { id: string }).id;

      writeFileSync(feature, 'Feature: Aviso E2E\n  Scenario: um\n    Given algo\n  Scenario: dois\n    Given outro\n');
      await request.post('/api/v1/varreduras');

      await page.goto(`/projetos/${id}`);
      const aviso = page.getByRole('status', { name: /Atualizações em/ });
      await expect(aviso).toContainText('1 alterado');
      await page.getByRole('button', { name: 'Marcar como visto' }).click();
      await expect(aviso).toHaveCount(0);

      await request.delete(`/api/v1/projetos/${id}`);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});
