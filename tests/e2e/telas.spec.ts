import { expect, test } from '@playwright/test';

async function marketplaceId(request: import('@playwright/test').APIRequestContext) {
  const body = (await (await request.get('/api/v1/projetos')).json()) as { items: { id: string; nome: string }[] };
  const id = body.items.find((p) => p.nome === 'Marketplace')?.id;
  if (!id) throw new Error('projeto Marketplace não encontrado');
  return id;
}

test.describe('tela, componentes e capturas (itens 1, 3 e 4)', () => {
  test('o detalhe mostra a tela ligada à regra e os componentes', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/regras/RN-CHK-001`);
    const painel = page.getByRole('complementary', { name: 'Onde a regra está' });
    await expect(painel.getByText('Tela e componentes')).toBeVisible();
    await expect(painel.getByText('CheckoutPage', { exact: true })).toBeVisible();
    await expect(painel.getByText('pela tag')).toBeVisible();
    await expect(painel.getByText('FormularioEndereco', { exact: true })).toBeVisible();
  });

  test('o cenário mostra as capturas de tela da execução, com imagem carregada', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/regras/RN-CHK-001`);
    const galeria = page.getByRole('list', { name: 'Capturas de tela da execução' });
    await expect(galeria).toBeVisible();
    const imagem = galeria.locator('img').first();
    await expect(imagem).toBeVisible();
    expect(await imagem.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  });

  test('a tela ligada por rota num passo aparece com origem "pela rota no passo"', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/regras/RN-CUP-001`);
    const painel = page.getByRole('complementary', { name: 'Onde a regra está' });
    await expect(painel.getByText('CupomPage', { exact: true })).toBeVisible();
    await expect(painel.getByText('pela rota no passo')).toBeVisible();
  });

  test('o modo apresentação mostra a tela e a captura da regra', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/apresentar/checkout?regra=RN-CHK-001`);
    await expect(page.getByText('Tela: CheckoutPage · /checkout')).toBeVisible();
    const figura = page.locator('figure img');
    await expect(figura).toBeVisible();
    expect(await figura.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  });

  test('a estrutura do projeto lista as telas declaradas', async ({ page, request }) => {
    const id = await marketplaceId(request);
    await page.goto(`/projetos/${id}/estrutura`);
    await expect(page.getByRole('heading', { name: 'Telas declaradas' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '/checkout', exact: true })).toBeVisible();
  });
});
