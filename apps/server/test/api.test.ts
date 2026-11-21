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
const FIXTURES = join(here, '..', '..', '..', 'fixtures');
const dataDir = mkdtempSync(join(tmpdir(), 'bv-api-'));

const config: AppConfig = {
  workspaces: [FIXTURES],
  host: '127.0.0.1',
  port: 0,
  scanIntervalSeconds: 0,
  dataDir,
  logLevel: 'error',
};

const logger = pino({ level: 'silent' });
const store = new Store(join(dataDir, 'behavior.db'));
const state = new AppState(config, store, logger);
const app = await buildApp({
  config,
  logger,
  store,
  state,
  version: '0.1.0-test',
  webDir: join(dataDir, 'sem-web'),
});

let projetoId = '';

beforeAll(async () => {
  await state.refresh();
  const list = await app.inject({ method: 'GET', url: '/api/v1/projetos' });
  projetoId = list.json().items.find((p: { nome: string }) => p.nome === 'Marketplace').id;
});

afterAll(async () => {
  await app.close();
  store.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('API /api/v1', () => {
  it('health responde com versão e número de projetos', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', versao: '0.1.0-test', projetos: 2 });
  });

  it('lista projetos com stacks rotuladas e contadores', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/projetos' });
    const m = res.json().items.find((p: { id: string }) => p.id === projetoId);
    expect(m.stacks.map((s: { rotulo: string }) => s.rotulo).sort()).toEqual([
      'Flutter',
      'Java',
      'TypeScript',
    ]);
    expect(m.contadores.regras).toBe(9);
    expect(m.selecionado).toBe(true);
  });

  it('filtra regras por stack e status (RF-30 a RF-32)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projetos/${projetoId}/regras?stack=typescript&status=falhando`,
    });
    const ids = res.json().items.map((r: { id: string }) => r.id);
    expect(ids).toEqual(['RN-CUP-003']);
  });

  it('filtra por texto em ID, título e tag (RF-30)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projetos/${projetoId}/regras?q=RN-CUP`,
    });
    expect(res.json().total).toBe(4);
  });

  it('"Só divergentes" traz apenas regras ausentes em alguma stack (RF-32)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projetos/${projetoId}/regras?divergentes=true`,
    });
    const items = res.json().items as { id: string; divergente: boolean }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.divergente)).toBe(true);
  });

  it('detalhe da regra traz implementações, ausências e histórico de 14 posições (RF-33 a RF-39)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/regras/RN-CUP-003?projeto=${projetoId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.implementacoes.map((i: { stack: string }) => i.stack).sort()).toEqual([
      'java',
      'typescript',
    ]);
    expect(body.ausentes.map((a: { stack: string }) => a.stack)).toEqual(['flutter']);
    expect(body.titulo).toBe('Cupom não se soma a outra promoção');
    expect(body.situacao).toBe('O carrinho contém "Tênis Run" com 20% de desconto promocional');
    const java = body.historico.find((h: { stack: string }) => h.stack === 'java');
    expect(java.execucoes).toHaveLength(14);
    expect(java.execucoes[13].status).toBe('passando');
  });

  it('erro de regra inexistente tem código e status 404 (RNF-13)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/regras/RN-NAO-EXISTE?projeto=${projetoId}`,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().erro.codigo).toBe('regra-nao-encontrada');
  });

  it('exporta Gherkin da regra para copiar (RF-38)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/regras/RN-CUP-003/gherkin?projeto=${projetoId}&stack=java`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Regra: Cupom não se soma a outra promoção');
    expect(res.body).toContain('Cenário: Product on promotion with coupon applied');
  });

  it('selecionar um projeto o tira da visão geral, sem apagar dados (RF-02)', async () => {
    const before = await app.inject({ method: 'GET', url: '/api/v1/visao-geral' });
    const put = await app.inject({
      method: 'PUT',
      url: `/api/v1/projetos/${projetoId}/selecao`,
      payload: { selecionado: false },
    });
    expect(put.statusCode).toBe(200);
    const after = await app.inject({ method: 'GET', url: '/api/v1/visao-geral' });
    expect(after.json().regras).toBeLessThan(before.json().regras);
    const search = await app.inject({ method: 'GET', url: '/api/v1/busca?q=RN-CUP-003' });
    expect(search.json().total).toBe(0);
    await app.inject({
      method: 'PUT',
      url: `/api/v1/projetos/${projetoId}/selecao`,
      payload: { selecionado: true },
    });
  });

  it('rejeita corpo inválido na seleção com 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/projetos/${projetoId}/selecao`,
      payload: { selecionado: 'sim' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('busca global encontra regra por título (RF-47)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/busca?q=promocao' });
    expect(res.json().items.some((i: { id: string }) => i.id === 'RN-CUP-003')).toBe(true);
  });

  it('erros de leitura são listados sem derrubar a API (RF-12)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/erros' });
    expect(
      res.json().items.some((e: { arquivo: string }) => e.arquivo.endsWith('quebrado.feature'))
    ).toBe(true);
  });
});
