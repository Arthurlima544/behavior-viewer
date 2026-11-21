import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function marketplaceId(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get('/api/v1/projetos');
  const body = (await res.json()) as { items: { id: string; nome: string }[] };
  const id = body.items.find((p) => p.nome === 'Marketplace')?.id;
  if (!id) throw new Error('projeto Marketplace não encontrado');
  return id;
}

test.describe('visão geral (RF-23 a RF-26)', () => {
  test('mostra indicadores, cards de projeto e divergências', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Indicadores' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Marketplace/ }).first()).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Divergências' })).toContainText('Avaliações');
  });

  test('não tem violações graves de acessibilidade (RNF-08)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const graves = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('catálogo e filtros (RF-27 a RF-32)', () => {
  test('filtra por stack e reflete na URL', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}`);
    await expect(page.getByRole('heading', { name: 'Catálogo de regras' })).toBeVisible();
    await page.getByRole('button', { name: 'Java' }).click();
    await expect(page).toHaveURL(/stack=java/);
    await expect(page.getByRole('link', { name: /RN-CUP-006/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /RN-CUP-003/ })).toBeVisible();
  });

  test('"Só divergentes" mostra regras ausentes em alguma stack', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}`);
    await page.getByRole('button', { name: 'Só divergentes' }).click();
    await expect(page.getByRole('link', { name: /RN-CUP-003/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /RN-CHK-001/ })).toHaveCount(0);
  });

  test('busca por texto filtra regras por ID', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}`);
    await page.getByRole('searchbox', { name: 'Filtrar regras' }).fill('RN-CHK');
    await expect(page.getByRole('link', { name: /RN-CHK-004/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /RN-CUP-001/ })).toHaveCount(0);
  });
});

test.describe('busca global (RF-47)', () => {
  test('Ctrl+K abre a busca e Enter leva ao detalhe', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Buscar regra' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Buscar regra, tag ou ID' }).fill('CUP-003');
    await expect(dialog.getByRole('option').first()).toContainText('RN-CUP-003');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/regras\/RN-CUP-003/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cupom não se soma');
  });
});

test.describe('detalhe da regra (RF-33 a RF-39)', () => {
  test('mostra onde a regra está, stacks ausentes e histórico de 14 posições', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/regras/RN-CUP-003`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cupom não se soma');
    const onde = page.getByRole('complementary', { name: 'Onde a regra está' });
    await expect(onde).toContainText('TypeScript');
    await expect(onde).toContainText('Java');
    await expect(onde).toContainText('Nenhum cenário com esta regra na stack Flutter');
    await expect(page.getByRole('button', { name: 'Copiar Gherkin' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Execuções em Java' }).locator('li')).toHaveCount(14);
  });

  test('alterna entre Gherkin e texto simples (RF-35)', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/regras/RN-CUP-003`);
    const texto = page.getByRole('button', { name: 'Texto simples' });
    await texto.click();
    await expect(texto).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('body')).not.toContainText('Dado');
  });
});

test.describe('modo apresentação (RF-42 a RF-46)', () => {
  test('navega por botões e por teclado, e sai para o catálogo', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/apresentar/cupons-de-desconto?regra=RN-CUP-001`);
    await expect(page.getByText('1 de 4')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Regra anterior' })).toBeDisabled();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('2 de 4')).toBeVisible();
    await page.getByRole('button', { name: 'Próxima regra' }).click();
    await expect(page.getByText('3 de 4')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/projetos\/[^/]+$/);
  });
});

test.describe('estados de erro e navegação', () => {
  test('projeto inexistente mostra mensagem clara', async ({ page }) => {
    await page.goto('/projetos/nao-existe');
    await expect(page.getByText('Projeto não encontrado.')).toBeVisible();
  });

  test('regra inexistente retorna erro legível', async ({ page, request }) => {
    const id = await marketplaceId(request);
    const res = await request.get(`/api/v1/regras/RN-XYZ-999?projeto=${id}`);
    expect(res.status()).toBe(404);
    await page.goto(`/projetos/${id}/regras/RN-XYZ-999`);
    await expect(page.getByRole('alert')).toContainText('não encontrada');
  });
});
