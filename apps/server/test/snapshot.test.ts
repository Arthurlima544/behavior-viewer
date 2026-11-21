import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { buildSnapshot } from '../src/snapshot.js';
import type { Snapshot } from '../src/model.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '..', '..', '..', 'tests', 'fixtures');

let snap: Snapshot;

beforeAll(async () => {
  const result = await buildSnapshot(
    {
      browseRoots: [join(here, '..', '..', '..')],
      browseLabel: '~',
      host: '127.0.0.1',
      port: 0,
      scanIntervalSeconds: 0,
      dataDir: join(here, '.tmp'),
      logLevel: 'error',
    },
    [{ root: join(FIXTURES, 'marketplace') }, { root: join(FIXTURES, 'projeto-sem-config') }],
  );
  snap = result;
});

function marketplace() {
  const p = snap.projetos.find((x) => x.nome === 'Marketplace');
  if (!p) throw new Error('projeto Marketplace não encontrado');
  return p;
}

describe('snapshot das fixtures', () => {
  it('encontra os dois projetos: um com config e um detectado automaticamente (RF-01, RF-05)', () => {
    expect(snap.projetos.map((p) => [p.nome, p.origem]).sort()).toEqual([
      ['Marketplace', 'config'],
      ['projeto-sem-config', 'auto'],
    ]);
  });

  it('agrupa as três stacks em um projeto (RF-03, RF-04)', () => {
    expect(
      marketplace()
        .stacks.map((s) => s.id)
        .sort()
    ).toEqual(['flutter', 'java', 'typescript']);
  });

  it('consolida regras por ID entre stacks (RF-13) e por título quando não há ID (RF-14)', () => {
    const ids = marketplace()
      .regras.map((r) => r.id)
      .sort();
    expect(ids).toEqual(
      [
        'RN-CHK-001',
        'RN-CHK-004',
        'RN-CHK-007',
        'RN-CHK-009',
        'RN-CUP-001',
        'RN-CUP-003',
        'RN-CUP-005',
        'RN-CUP-006',
      ]
        .concat(ids.filter((i) => i.startsWith('PROV-')))
        .sort()
    );
    const cup3 = marketplace().regras.find((r) => r.id === 'RN-CUP-003');
    expect(cup3?.implementacoes.map((i) => i.stack).sort()).toEqual(['java', 'typescript']);
  });

  it('marca a regra sem ID como provisória com aviso (RF-09)', () => {
    const prov = marketplace().regras.find((r) => r.id.startsWith('PROV-'));
    expect(prov?.origem).toBe('provisorio');
    expect(prov?.implementacoes.map((i) => i.stack)).toEqual(['typescript']);
    expect(prov?.avisos.length).toBeGreaterThan(0);
  });

  it('calcula o status por stack a partir dos relatórios (RF-19)', () => {
    const p = marketplace();
    const cup3 = p.regras.find((r) => r.id === 'RN-CUP-003')!;
    expect(cup3.implementacoes.find((i) => i.stack === 'typescript')?.status).toBe('falhando');
    expect(cup3.implementacoes.find((i) => i.stack === 'java')?.status).toBe('passando');
    expect(cup3.status).toBe('falhando');

    const chk7 = p.regras.find((r) => r.id === 'RN-CHK-007')!;
    expect(chk7.implementacoes.find((i) => i.stack === 'java')?.status).toBe('pendente');

    const cup5 = p.regras.find((r) => r.id === 'RN-CUP-005')!;
    expect(cup5.implementacoes.find((i) => i.stack === 'flutter')?.status).toBe('falhando');
  });

  it('gera matriz de presença por funcionalidade e stack (RF-15)', () => {
    const cupons = marketplace().matriz.find((l) => l.funcionalidadeKey === 'cupons-de-desconto');
    expect(cupons?.total).toBe(4);
    const byStack = Object.fromEntries(cupons!.celulas.map((c) => [c.stack, c.covered]));
    expect(byStack).toEqual({ flutter: 3, typescript: 4, java: 3 });
  });

  it('lista divergências entre stacks do mesmo projeto (RF-16)', () => {
    const divs = marketplace().divergencias.map((d) => [d.regraId, d.ausentes]);
    expect(divs).toEqual(
      expect.arrayContaining([
        ['RN-CUP-003', ['flutter']],
        ['RN-CUP-006', ['java']],
      ])
    );
  });

  it('projeto sem config: regra implícita e erro de sintaxe isolado (RF-10, RF-12)', () => {
    const pag = snap.projetos.find((p) => p.nome === 'projeto-sem-config')!;
    expect(pag.stacks.map((s) => s.id)).toEqual(['typescript']);
    expect(pag.regras.some((r) => r.origem === 'implicita')).toBe(true);
    expect(pag.regras.some((r) => r.origem === 'provisorio')).toBe(true);
    expect(snap.erros.some((e) => e.arquivo.endsWith('quebrado.feature') && e.linha !== null)).toBe(
      true
    );
    expect(marketplace().regras.length).toBeGreaterThan(0);
  });

  it('um mesmo ID tem o mesmo nome de funcionalidade em todas as stacks', () => {
    const chk = marketplace().regras.find((r) => r.id === 'RN-CHK-001');
    expect(chk?.funcionalidadeKey).toBe('checkout');
    expect(chk?.implementacoes).toHaveLength(3);
  });
});
