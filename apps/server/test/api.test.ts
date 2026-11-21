import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/api/app.js';
import type { AppConfig } from '../src/config.js';
import { Store } from '../src/store.js';
import { AppState } from '../src/state.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..', '..');
const FIXTURES = join(REPO, 'tests', 'fixtures');
const MARKETPLACE = join(FIXTURES, 'marketplace');
const SEM_CONFIG = join(FIXTURES, 'projeto-sem-config');
const dataDir = mkdtempSync(join(tmpdir(), 'bv-api-'));

// As pastas navegáveis são o repositório inteiro, para testar escolha e validação de caminhos.
const config: AppConfig = {
  browseRoots: [REPO],
  browseLabel: '~',
  host: '127.0.0.1',
  port: 0,
  scanIntervalSeconds: 0,
  dataDir,
  logLevel: 'error',
};

const logger = pino({ level: 'silent' });
const store = new Store(join(dataDir, 'behavior.db'));
const state = new AppState(config, store, logger);
const app = await buildApp({ config, logger, store, state, version: '0.1.0-test', webDir: join(dataDir, 'sem-web') });

let marketplaceId = '';
let semConfigId = '';

beforeAll(async () => {
  await state.refresh();
});

afterAll(async () => {
  await app.close();
  store.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function registrar(caminho: string) {
  return app.inject({ method: 'POST', url: '/api/v1/projetos', payload: { caminho } });
}

describe('sistema vazio (sem mocks)', () => {
  it('health responde sem nenhum projeto registrado', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.json()).toMatchObject({ status: 'ok', projetos: 0 });
  });

  it('lista de projetos começa vazia', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/projetos' });
    expect(res.json().items).toEqual([]);
  });
});

describe('navegação e descoberta (RF-01, RF-03)', () => {
  it('lista as raízes permitidas quando nenhum caminho é informado', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/sistema/pastas' });
    expect(res.json()).toMatchObject({ caminho: null, exibicao: '~' });
    expect(res.json().itens).toHaveLength(1);
  });

  it('lista subpastas de uma pasta permitida, marcando as que são projetos', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/sistema/pastas?caminho=${encodeURIComponent(FIXTURES)}` });
    const nomes = res.json().itens.map((i: { nome: string }) => i.nome);
    expect(nomes).toEqual(expect.arrayContaining(['marketplace', 'projeto-sem-config']));
    const marketplace = res.json().itens.find((i: { nome: string }) => i.nome === 'marketplace');
    expect(marketplace.ehProjeto).toBe(true);
  });

  it('identifica os projetos de uma pasta escolhida, sem registrar (RF-01, RF-03)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/descobertas', payload: { caminho: FIXTURES } });
    expect(res.statusCode).toBe(200);
    const nomes = res.json().candidatos.map((c: { nome: string }) => c.nome).sort();
    expect(nomes).toEqual(['Marketplace', 'projeto-sem-config']);
    const marketplace = res.json().candidatos.find((c: { nome: string }) => c.nome === 'Marketplace');
    expect(marketplace.stacks.sort()).toEqual(['flutter', 'java', 'typescript']);
    expect(marketplace.funcionalidades).toBe(3);
    expect(marketplace.jaRegistrado).toBe(false);
    marketplaceId = marketplace.id;
    semConfigId = res.json().candidatos.find((c: { nome: string }) => c.nome === 'projeto-sem-config').id;
    const lista = await app.inject({ method: 'GET', url: '/api/v1/projetos' });
    expect(lista.json().items).toHaveLength(0);
  });
});

describe('segurança dos caminhos', () => {
  it('recusa caminhos fora das pastas permitidas (403)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/descobertas', payload: { caminho: '/etc' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().erro.codigo).toBe('fora-das-raizes');
  });

  it('recusa caminho relativo (400)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/descobertas', payload: { caminho: 'fixtures' } });
    expect(res.statusCode).toBe(400);
  });

  it('recusa escape com ".." para fora da raiz (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/descobertas',
      payload: { caminho: join(FIXTURES, '..', '..', '..') },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('registro de projetos (RF-02)', () => {
  it('registra um projeto identificado', async () => {
    const res = await registrar(MARKETPLACE);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ nome: 'Marketplace', origem: 'config' });
    expect(res.json().caminho).toBe('~/tests/fixtures/marketplace');
  });

  it('o projeto registrado passa a aparecer na visão geral com contadores reais', async () => {
    const visao = await app.inject({ method: 'GET', url: '/api/v1/visao-geral' });
    expect(visao.json()).toMatchObject({ projetos: 1, regras: 9 });
  });

  it('registra o segundo projeto por caminho digitado (inserção manual)', async () => {
    const res = await registrar(SEM_CONFIG);
    expect(res.statusCode).toBe(201);
    expect(res.json().origem).toBe('auto');
  });

  it('recusa registrar o mesmo projeto duas vezes (409)', async () => {
    const res = await registrar(MARKETPLACE);
    expect(res.statusCode).toBe(409);
  });

  it('recusa uma pasta sem arquivos .feature (422) com orientação', async () => {
    const res = await registrar(join(REPO, 'apps', 'server', 'src'));
    expect(res.statusCode).toBe(422);
    expect(res.json().erro.codigo).toBe('sem-bdd');
  });

  it('a descoberta marca os projetos já registrados', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/descobertas', payload: { caminho: FIXTURES } });
    const mp = res.json().candidatos.find((c: { nome: string }) => c.nome === 'Marketplace');
    expect(mp.jaRegistrado).toBe(true);
  });

  it('expõe a estrutura do projeto: stacks, funcionalidades por arquivo e erros (RF-03, RF-04)', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/projetos/${marketplaceId}/estrutura` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.stacks.map((s: { id: string }) => s.id).sort()).toEqual(['flutter', 'java', 'typescript']);
    expect(body.testes.arquivosFeature).toBeGreaterThanOrEqual(7);
    const checkout = body.funcionalidades.find((f: { funcionalidade: string; stack: string }) => f.funcionalidade === 'Checkout' && f.stack === 'java');
    expect(checkout.regras).toBe(4);
    expect(checkout.cenarios).toBeGreaterThan(0);
  });
});

describe('API de regras sobre os projetos registrados', () => {
  it('lista regras com filtros de stack e status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projetos/${marketplaceId}/regras?stack=typescript&status=falhando`,
    });
    expect(res.json().items.map((r: { id: string }) => r.id)).toEqual(['RN-CUP-003']);
  });

  it('filtra por texto em ID, título e tag', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/projetos/${marketplaceId}/regras?q=RN-CUP` });
    expect(res.json().total).toBe(4);
  });

  it('"Só divergentes" traz apenas regras ausentes em alguma stack', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/projetos/${marketplaceId}/regras?divergentes=true` });
    const items = res.json().items as { divergente: boolean }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.divergente)).toBe(true);
  });

  it('detalhe da regra traz implementações, ausências e histórico de 14 posições', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/regras/RN-CUP-003?projeto=${marketplaceId}` });
    const body = res.json();
    expect(body.implementacoes.map((i: { stack: string }) => i.stack).sort()).toEqual(['java', 'typescript']);
    expect(body.ausentes.map((a: { stack: string }) => a.stack)).toEqual(['flutter']);
    expect(body.titulo).toBe('Cupom não se soma a outra promoção');
    expect(body.situacao).toBe('O carrinho contém "Tênis Run" com 20% de desconto promocional');
    const java = body.historico.find((h: { stack: string }) => h.stack === 'java');
    expect(java.execucoes).toHaveLength(14);
    expect(java.execucoes[13].status).toBe('passando');
  });

  it('regra inexistente retorna 404 com código', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/regras/RN-NAO-EXISTE?projeto=${marketplaceId}` });
    expect(res.statusCode).toBe(404);
    expect(res.json().erro.codigo).toBe('regra-nao-encontrada');
  });

  it('exporta Gherkin da regra para copiar (RF-38)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/regras/RN-CUP-003/gherkin?projeto=${marketplaceId}&stack=java`,
    });
    expect(res.body).toContain('Regra: Cupom não se soma a outra promoção');
    expect(res.body).toContain('Cenário: Product on promotion with coupon applied');
  });

  it('selecionar um projeto o tira da visão geral, sem apagar dados (RF-02)', async () => {
    const before = await app.inject({ method: 'GET', url: '/api/v1/visao-geral' });
    const put = await app.inject({ method: 'PUT', url: `/api/v1/projetos/${marketplaceId}/selecao`, payload: { selecionado: false } });
    expect(put.statusCode).toBe(200);
    const after = await app.inject({ method: 'GET', url: '/api/v1/visao-geral' });
    expect(after.json().regras).toBeLessThan(before.json().regras);
    await app.inject({ method: 'PUT', url: `/api/v1/projetos/${marketplaceId}/selecao`, payload: { selecionado: true } });
  });

  it('busca global encontra regra por título', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/busca?q=promocao' });
    expect(res.json().items.some((i: { id: string }) => i.id === 'RN-CUP-003')).toBe(true);
  });

  it('erros de leitura são listados sem derrubar a API (RF-12)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/erros' });
    expect(res.json().items.some((e: { arquivo: string }) => e.arquivo.endsWith('quebrado.feature'))).toBe(true);
  });
});

describe('remoção de projetos', () => {
  it('remove o registro sem apagar os arquivos do usuário', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/projetos/${semConfigId}` });
    expect(res.statusCode).toBe(204);
    const lista = await app.inject({ method: 'GET', url: '/api/v1/projetos' });
    expect(lista.json().items.map((p: { nome: string }) => p.nome)).toEqual(['Marketplace']);
    const again = await app.inject({ method: 'DELETE', url: `/api/v1/projetos/${semConfigId}` });
    expect(again.statusCode).toBe(404);
  });
});
