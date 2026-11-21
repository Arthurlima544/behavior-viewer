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

describe('telas e capturas pela API (itens 3 e 4)', () => {
  it('o detalhe da regra traz telas, componentes e capturas com URL de imagem', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/regras/RN-CHK-001?projeto=${marketplaceId}` });
    const body = res.json();
    expect(body.telas.map((t: { nome: string }) => t.nome)).toContain('CheckoutPage');
    const web = body.implementacoes.find((i: { stack: string }) => i.stack === 'typescript');
    const cenario = web.cenarios.find((c: { nome: string }) => c.nome === 'Finalizar sem endereço válido');
    expect(cenario.capturas[0].url).toMatch(/^\/api\/v1\/capturas\?projeto=/);
  });

  it('serve a imagem de captura como PNG', async () => {
    const arquivo = encodeURIComponent('reports/capturas/checkout/finalizar-sem-endereco-valido/01-dado.png');
    const res = await app.inject({ method: 'GET', url: `/api/v1/capturas?projeto=${marketplaceId}&arquivo=${arquivo}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.rawPayload.subarray(1, 4).toString('ascii')).toBe('PNG');
  });

  it('recusa caminho de captura que sai do projeto (400)', async () => {
    const arquivo = encodeURIComponent('../../package.json');
    const res = await app.inject({ method: 'GET', url: `/api/v1/capturas?projeto=${marketplaceId}&arquivo=${arquivo}` });
    expect(res.statusCode).toBe(400);
  });

  it('recusa caminho absoluto (400)', async () => {
    const arquivo = encodeURIComponent('/etc/passwd.png');
    const res = await app.inject({ method: 'GET', url: `/api/v1/capturas?projeto=${marketplaceId}&arquivo=${arquivo}` });
    expect(res.statusCode).toBe(400);
  });

  it('captura inexistente retorna 404', async () => {
    const arquivo = encodeURIComponent('reports/capturas/nao-existe.png');
    const res = await app.inject({ method: 'GET', url: `/api/v1/capturas?projeto=${marketplaceId}&arquivo=${arquivo}` });
    expect(res.statusCode).toBe(404);
  });

  it('a estrutura do projeto lista as telas declaradas', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/projetos/${marketplaceId}/estrutura` });
    expect(res.json().telas.map((t: { nome: string }) => t.nome)).toEqual(expect.arrayContaining(['CheckoutPage', 'CupomPage']));
  });
});

describe('sincronizar (botão Sincronizar)', () => {
  it('reflete cenários adicionados, alterados e removidos, sem reiniciar', async () => {
    const { mkdirSync, writeFileSync, rmSync: rm } = await import('node:fs');
    const pasta = join(REPO, 'tests', `tmp-sync-${process.pid}-${Date.now()}`);
    const feature = join(pasta, 'features', 'a.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(feature, 'Feature: Sync\n  Scenario: primeiro\n    Given algo\n');
      const reg = await app.inject({ method: 'POST', url: '/api/v1/projetos', payload: { caminho: pasta } });
      expect(reg.statusCode).toBe(201);
      const id = reg.json().id;
      const contagem = async () =>
        (await app.inject({ method: 'GET', url: '/api/v1/projetos' })).json().items.find((p: { id: string }) => p.id === id).contadores.cenarios;

      expect(await contagem()).toBe(1);

      writeFileSync(feature, 'Feature: Sync\n  Scenario: primeiro\n    Given algo\n  Scenario: segundo\n    Given outro\n');
      const sync = await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      expect(sync.statusCode).toBe(200);
      expect(sync.json().status).toBe('concluida');
      expect(await contagem()).toBe(2);

      writeFileSync(feature, 'Feature: Sync\n  Scenario: só este\n    Given algo\n');
      await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      expect(await contagem()).toBe(1);

      rm(feature);
      await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      expect(await contagem()).toBe(0);

      await app.inject({ method: 'DELETE', url: `/api/v1/projetos/${id}` });
    } finally {
      rm(pasta, { recursive: true, force: true });
    }
  });
});

describe('atualizações da pasta de testes (SHA-256)', () => {
  it('avisa quando a pasta muda e some quando o usuário marca como visto', async () => {
    const { mkdirSync, writeFileSync, rmSync: rm } = await import('node:fs');
    const pasta = join(REPO, 'tests', `tmp-aviso-${process.pid}-${Date.now()}`);
    const feature = join(pasta, 'features', 'a.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(feature, 'Feature: Aviso\n  Scenario: um\n    Given algo\n');
      const reg = await app.inject({ method: 'POST', url: '/api/v1/projetos', payload: { caminho: pasta } });
      const id = reg.json().id;
      const atualizacoes = async () =>
        (await app.inject({ method: 'GET', url: '/api/v1/projetos' })).json().items.find((p: { id: string }) => p.id === id).atualizacoes;

      // Recém-registrado: a pasta atual é a linha de base, então nada pendente.
      expect((await atualizacoes()).pendentes).toBe(false);

      writeFileSync(feature, 'Feature: Aviso\n  Scenario: um\n    Given algo\n  Scenario: dois\n    Given outro\n');
      await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      let a = await atualizacoes();
      expect(a).toMatchObject({ pendentes: true, alterados: ['features/a.feature'], antes: { cenarios: 1 }, agora: { cenarios: 2 } });

      const visto = await app.inject({ method: 'POST', url: `/api/v1/projetos/${id}/visto` });
      expect(visto.statusCode).toBe(200);
      expect((await atualizacoes()).pendentes).toBe(false);

      writeFileSync(join(pasta, 'features', 'b.feature'), 'Feature: Novo\n  Scenario: novo\n    Given x\n');
      rm(feature);
      await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      a = await atualizacoes();
      expect(a.pendentes).toBe(true);
      expect(a.novos).toEqual(['features/b.feature']);
      expect(a.removidos).toEqual(['features/a.feature']);

      await app.inject({ method: 'DELETE', url: `/api/v1/projetos/${id}` });
    } finally {
      rm(pasta, { recursive: true, force: true });
    }
  });
});

describe('novas e alteradas desde a última visualização', () => {
  it('marca regra nova, regra alterada e cenários, e limpa ao marcar como visto', async () => {
    const { mkdirSync, writeFileSync, rmSync: rm } = await import('node:fs');
    const pasta = join(REPO, 'tests', `tmp-marc-${process.pid}-${Date.now()}`);
    const feature = join(pasta, 'features', 'm.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(
        feature,
        'Feature: Marcação\n  @RN-MRC-001\n  Rule: Regra A\n    Scenario: a\n      Given x\n',
      );
      const reg = await app.inject({ method: 'POST', url: '/api/v1/projetos', payload: { caminho: pasta } });
      const id = reg.json().id;
      const regras = async (q: string) =>
        (await app.inject({ method: 'GET', url: `/api/v1/projetos/${id}/regras?${q}` })).json().items.map((r: { id: string }) => r.id);

      // Recém-registrado: nada marcado.
      expect(await regras('marcacao=mudancas')).toEqual([]);

      writeFileSync(
        feature,
        'Feature: Marcação\n  @RN-MRC-001\n  Rule: Regra A\n    Scenario: a\n      Given y\n  @RN-MRC-002\n  Rule: Regra B\n    Scenario: b\n      Given z\n',
      );
      await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      expect(await regras('marcacao=novo')).toEqual(['RN-MRC-002']);
      expect(await regras('marcacao=alterado')).toEqual(['RN-MRC-001']);
      expect(await regras('marcacao=mudancas')).toEqual(['RN-MRC-001', 'RN-MRC-002']);

      const det = await app.inject({ method: 'GET', url: `/api/v1/regras/RN-MRC-001?projeto=${id}` });
      expect(det.json().implementacoes[0].cenarios[0].marcacao).toBe('alterado');

      const visto = await app.inject({ method: 'POST', url: `/api/v1/projetos/${id}/visto` });
      expect(visto.statusCode).toBe(200);
      expect(await regras('marcacao=mudancas')).toEqual([]);

      const bad = await app.inject({ method: 'GET', url: `/api/v1/projetos/${id}/regras?marcacao=xpto` });
      expect(bad.statusCode).toBe(400);

      await app.inject({ method: 'DELETE', url: `/api/v1/projetos/${id}` });
    } finally {
      rm(pasta, { recursive: true, force: true });
    }
  });
});

describe('detecção de mudanças sem sincronizar automaticamente', () => {
  it('detectar registra pendência sem alterar os dados; só sincronizar atualiza', async () => {
    const { mkdirSync, writeFileSync, rmSync: rm } = await import('node:fs');
    const pasta = join(REPO, 'tests', `tmp-pend-${process.pid}-${Date.now()}`);
    const feature = join(pasta, 'features', 'p.feature');
    try {
      mkdirSync(join(pasta, 'features'), { recursive: true });
      writeFileSync(join(pasta, 'package.json'), JSON.stringify({ devDependencies: { '@cucumber/cucumber': '^11.0.0' } }));
      writeFileSync(feature, 'Feature: Pend\n  Scenario: um\n    Given algo\n');
      const id = (await app.inject({ method: 'POST', url: '/api/v1/projetos', payload: { caminho: pasta } })).json().id;
      const resumo = async () =>
        (await app.inject({ method: 'GET', url: '/api/v1/projetos' })).json().items.find((p: { id: string }) => p.id === id);

      expect((await resumo()).pendencias).toBeNull();

      writeFileSync(feature, 'Feature: Pend\n  Scenario: um\n    Given algo\n  Scenario: dois\n    Given outro\n');
      await state.detectar();
      let r = await resumo();
      expect(r.pendencias).toMatchObject({ alterados: ['features/p.feature'] });
      // Os dados exibidos continuam os do último sincronismo.
      expect(r.contadores.cenarios).toBe(1);

      const sync = await app.inject({ method: 'POST', url: '/api/v1/varreduras' });
      expect(sync.statusCode).toBe(200);
      r = await resumo();
      expect(r.pendencias).toBeNull();
      expect(r.contadores.cenarios).toBe(2);

      await app.inject({ method: 'DELETE', url: `/api/v1/projetos/${id}` });
    } finally {
      rm(pasta, { recursive: true, force: true });
    }
  });
});
