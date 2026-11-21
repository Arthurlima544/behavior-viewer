import { expect, test } from '@playwright/test';

test.describe('alerta de mudanças nos testes (sem sincronização automática)', () => {
  test('avisa sobre mudanças e só atualiza os dados ao clicar em Sincronizar', async ({ page, request }) => {
    const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const pasta = resolve('tests', `tmp-e2e-pend-${Date.now()}`);
    const feature = join(pasta, 'features', 'q.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(feature, 'Feature: Pend E2E\n  Scenario: um\n    Given algo\n');
      const reg = await request.post('/api/v1/projetos', { data: { caminho: pasta } });
      const id = ((await reg.json()) as { id: string }).id;

      writeFileSync(feature, 'Feature: Pend E2E\n  Scenario: um\n    Given algo\n  Scenario: dois\n    Given outro\n');

      await page.goto(`/projetos/${id}/estrutura`);
      const alerta = page.getByRole('status', { name: 'Alterações nos testes BDD' });
      await expect(alerta).toBeVisible({ timeout: 15_000 });
      await expect(alerta).toContainText('Clique em Sincronizar');

      // Antes de sincronizar, os dados exibidos continuam os do último sincronismo.
      const visao = await request.get(`/api/v1/projetos/${id}/estrutura`);
      expect(((await visao.json()) as { testes: { cenarios: number } }).testes.cenarios).toBe(1);

      await alerta.getByRole('button', { name: 'Sincronizar' }).click();
      await expect(alerta).toHaveCount(0);
      const depois = await request.get(`/api/v1/projetos/${id}/estrutura`);
      expect(((await depois.json()) as { testes: { cenarios: number } }).testes.cenarios).toBe(2);

      await request.delete(`/api/v1/projetos/${id}`);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});
