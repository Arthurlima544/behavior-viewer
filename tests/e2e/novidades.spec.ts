import { expect, test } from '@playwright/test';

test.describe('novas e alteradas no catálogo e na apresentação', () => {
  test('marca, filtra e apresenta só as novidades', async ({ page, request }) => {
    const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const pasta = resolve('tests', `tmp-e2e-novidades-${Date.now()}`);
    const feature = join(pasta, 'features', 'n.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(feature, 'Feature: Novidades E2E\n  @RN-NOV-001\n  Rule: Regra existente\n    Scenario: antiga\n      Given x\n');
      const reg = await request.post('/api/v1/projetos', { data: { caminho: pasta } });
      const id = ((await reg.json()) as { id: string }).id;

      // Altera a regra existente e acrescenta uma regra nova.
      writeFileSync(
        feature,
        'Feature: Novidades E2E\n  @RN-NOV-001\n  Rule: Regra existente\n    Scenario: antiga\n      Given y\n  @RN-NOV-002\n  Rule: Regra nova\n    Scenario: nova\n      Given z\n',
      );
      await request.post('/api/v1/varreduras');

      await page.goto(`/projetos/${id}`);
      await expect(page.getByText('NOVO', { exact: true })).toBeVisible();
      await expect(page.getByText('ALTERADO', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: '1 nova' }).click();
      await expect(page).toHaveURL(/marcacao=novo/);
      await expect(page.getByRole('link', { name: /RN-NOV-002/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /RN-NOV-001/ })).toHaveCount(0);

      await page.goto(`/projetos/${id}/apresentar/_tudo?marcacao=mudancas`);
      await expect(page.getByText(/^1 de 2$/)).toBeVisible();
      await expect(page.getByText('Novidades E2E')).toHaveCount(0);

      await request.delete(`/api/v1/projetos/${id}`);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});
