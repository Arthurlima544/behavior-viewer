import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type { RuleOrigin } from '@behavior-viewer/domain';
import { normalizeTitle, shortHash, slugify } from '@behavior-viewer/domain';

export interface Passo {
  palavra: string;
  texto: string;
  tipo: 'Context' | 'Action' | 'Outcome' | 'Unknown';
  linha: number;
}

export interface CenarioParsed {
  nome: string;
  linha: number;
  tipo: 'cenario' | 'esquema';
  tags: string[];
  passos: Passo[];
  /** Linhas de exemplo, com o cabeçalho na primeira linha (apenas para esquemas). */
  exemplos: string[][];
  /** Telas declaradas por @tela- (herdadas da regra ou da funcionalidade quando ausentes). */
  telas: string[];
  /** Componentes declarados por @componente- (com a mesma herança). */
  componentes: string[];
}

export interface RegraParsed {
  /** ID original (ex.: "RN-CUP-003") quando há tag `@RN-`. */
  idTag: string | null;
  /** Tags do bloco Rule:, sem a tag de ID. */
  tags: string[];
  origem: RuleOrigin;
  titulo: string;
  descricao: string;
  linha: number;
  situacao?: string;
  resultado?: string;
  cenarios: CenarioParsed[];
  avisos: string[];
  /** Telas da regra: @tela- da regra ou, se ausente, da funcionalidade. */
  telas: string[];
  componentes: string[];
}

export interface FuncionalidadeParsed {
  nome: string;
  descricao: string;
  idioma: string;
  tags: string[];
  linha: number;
  regras: RegraParsed[];
}

export interface ErroParse {
  linha: number | null;
  mensagem: string;
}

export type ParseOutcome =
  | { ok: true; funcionalidade: FuncionalidadeParsed | null; avisos: string[] }
  | { ok: false; erros: ErroParse[] };

const RN_TAG = /^@(RN-[A-Z0-9][A-Z0-9-]*-\d{2,})$/;

const CONTEXT = new Set(['Dado', 'Dada', 'Dados', 'Dadas', 'Given']);
const OUTCOME = new Set(['Então', 'Entao', 'Then']);

/** Remove o "que" inicial e capitaliza, para texto de negócio (ex.: "que o cupom..." → "O cupom..."). */
function businessText(text: string): string {
  const trimmed = text.trim().replace(/^que\s+/i, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Metadados de tela e componente lidos das tags Gherkin (docs/prompts). */
export interface MetadadosTela {
  telas: string[];
  componentes: string[];
}

const TAG_TELA = /^@tela[-:]([A-Za-z_][\w-]*)$/;
const TAG_COMPONENTE = /^@componente[-:]([A-Za-z_][\w-]*)$/;

/**
 * Lê @tela-<Nome> e @componente-<Nome> de uma lista de tags, sem duplicatas.
 * Aceita também a forma com dois-pontos (@tela:<Nome>), usada por projetos antigos.
 */
export function metadadosDe(tags: readonly string[]): MetadadosTela {
  const telas = new Set<string>();
  const componentes = new Set<string>();
  for (const tag of tags) {
    const t = TAG_TELA.exec(tag);
    if (t?.[1]) telas.add(t[1]);
    const c = TAG_COMPONENTE.exec(tag);
    if (c?.[1]) componentes.add(c[1]);
  }
  return { telas: [...telas], componentes: [...componentes] };
}

/**
 * Herança de metadados: para cada tipo (tela, componente), vale a declaração mais específica.
 * Cenário sobrepõe regra, e regra sobrepõe funcionalidade.
 */
function aplicarHeranca(funcionalidadeTags: string[], regras: RegraParsed[]): void {
  const deFuncionalidade = metadadosDe(funcionalidadeTags);
  for (const regra of regras) {
    const deRegra = metadadosDe(regra.tags);
    regra.telas = deRegra.telas.length > 0 ? deRegra.telas : deFuncionalidade.telas;
    regra.componentes = deRegra.componentes.length > 0 ? deRegra.componentes : deFuncionalidade.componentes;
    for (const cenario of regra.cenarios) {
      const deCenario = metadadosDe(cenario.tags);
      cenario.telas = deCenario.telas.length > 0 ? deCenario.telas : regra.telas;
      cenario.componentes = deCenario.componentes.length > 0 ? deCenario.componentes : regra.componentes;
    }
  }
}

function tagNames(tags: readonly { name: string }[]): string[] {
  return tags.map((t) => t.name);
}

function mapSteps(steps: readonly any[]): Passo[] {
  const passos: Passo[] = [];
  for (const step of steps) {
    const palavra = String(step.keyword ?? '').trim();
    const keywordType = (step.keywordType as Passo['tipo'] | undefined) ?? 'Unknown';
    passos.push({
      palavra,
      texto: String(step.text ?? ''),
      tipo: keywordType,
      linha: Number(step.location?.line ?? 0),
    });
  }
  return passos;
}

function mapScenario(sc: any): CenarioParsed {
  const isOutline = Array.isArray(sc.examples) && sc.examples.length > 0;
  const exemplos: string[][] = [];
  for (const ex of sc.examples ?? []) {
    if (ex.tableHeader) exemplos.push(ex.tableHeader.cells.map((c: any) => String(c.value)));
    for (const row of ex.tableBody ?? []) {
      exemplos.push(row.cells.map((c: any) => String(c.value)));
    }
  }
  return {
    nome: String(sc.name),
    linha: Number(sc.location?.line ?? 0),
    tipo: isOutline ? 'esquema' : 'cenario',
    tags: tagNames(sc.tags ?? []),
    passos: mapSteps(sc.steps ?? []),
    exemplos: isOutline ? exemplos : [],
    telas: [],
    componentes: [],
  };
}

/** Situação = primeiro Dado; Resultado = primeiro Então, do cenário representativo (ADR-0006). */
function situacaoResultado(cenarios: readonly CenarioParsed[]): {
  situacao?: string;
  resultado?: string;
} {
  const first = cenarios[0];
  if (!first) return {};
  const given = first.passos.find((p) => p.tipo === 'Context' || CONTEXT.has(p.palavra));
  const then = first.passos.find((p) => p.tipo === 'Outcome' || OUTCOME.has(p.palavra));
  return {
    situacao: given ? businessText(given.texto) : undefined,
    resultado: then ? businessText(then.texto) : undefined,
  };
}

function makeRegra(
  titulo: string,
  descricao: string,
  linha: number,
  tags: string[],
  cenarios: CenarioParsed[],
  implicita: boolean,
  fileLabel: string
): RegraParsed {
  const idTag = tags.map((t) => RN_TAG.exec(t)?.[1]).find((v): v is string => Boolean(v)) ?? null;
  const avisos: string[] = [];
  let origem: RuleOrigin;
  if (idTag) {
    origem = 'tag';
  } else if (implicita) {
    origem = 'implicita';
    avisos.push('regra implícita: o cenário não está dentro de um bloco Rule:');
  } else {
    origem = 'provisorio';
    avisos.push(`regra sem ID (${fileLabel}): adicione uma tag @RN-… ao bloco Rule:`);
  }
  return {
    idTag,
    telas: [],
    componentes: [],
    tags: tags.filter((t) => !RN_TAG.test(t)),
    origem,
    titulo,
    descricao,
    linha,
    ...situacaoResultado(cenarios),
    cenarios,
    avisos,
  };
}

/**
 * Interpreta o conteúdo de um `.feature` (RF-06, RF-07, RF-08 a RF-12).
 * Regras: blocos `Rule:` com tag @RN-…; cenários soltos viram regras implícitas.
 */
export function parseFeatureSource(source: string, fileLabel: string): ParseOutcome {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
  let doc: any;
  try {
    doc = parser.parse(source);
  } catch (err: any) {
    const erros: ErroParse[] = Array.isArray(err?.errors)
      ? err.errors.map((e: any) => ({
          linha: e.location?.line ?? null,
          mensagem: String(e.message ?? e).split('\n')[0],
        }))
      : [{ linha: null, mensagem: String(err?.message ?? err).split('\n')[0] }];
    return { ok: false, erros };
  }

  const feature = doc.feature;
  if (!feature) return { ok: true, funcionalidade: null, avisos: ['arquivo sem bloco Feature:'] };

  const regras: RegraParsed[] = [];
  const looseScenarios: CenarioParsed[] = [];
  for (const child of feature.children ?? []) {
    if (child.rule) {
      const rule = child.rule;
      const cenarios = (rule.children ?? [])
        .filter((c: any) => c.scenario)
        .map((c: any) => mapScenario(c.scenario));
      regras.push(
        makeRegra(
          String(rule.name).trim(),
          String(rule.description ?? '').trim(),
          Number(rule.location?.line ?? 0),
          tagNames(rule.tags ?? []),
          cenarios,
          false,
          fileLabel
        )
      );
    } else if (child.scenario) {
      looseScenarios.push(mapScenario(child.scenario));
    }
  }

  for (const sc of looseScenarios) {
    regras.push(makeRegra(sc.nome, '', sc.linha, [], [sc], true, fileLabel));
  }

  aplicarHeranca(tagNames(feature.tags ?? []), regras);

  return {
    ok: true,
    avisos: [],
    funcionalidade: {
      nome: String(feature.name).trim(),
      descricao: String(feature.description ?? '').trim(),
      idioma: String(feature.language ?? 'en'),
      tags: tagNames(feature.tags ?? []),
      linha: Number(feature.location?.line ?? 0),
      regras,
    },
  };
}

/**
 * Chave de consolidação (RF-13, RF-14): ID da tag quando existe; senão o título normalizado.
 * Regras implícitas são chaveadas pela funcionalidade para não colidirem entre arquivos.
 */
export function consolidationKey(regra: RegraParsed, funcionalidadeNome: string): string {
  if (regra.idTag) return `id:${regra.idTag}`;
  if (regra.origem === 'implicita') {
    return `implicita:${slugify(funcionalidadeNome)}:${normalizeTitle(regra.titulo)}`;
  }
  return `titulo:${normalizeTitle(regra.titulo)}`;
}

/** ID exibido para a regra: o ID da tag, ou um ID provisório estável derivado do título. */
export function displayRuleId(regra: RegraParsed, funcionalidadeNome: string): string {
  if (regra.idTag) return regra.idTag;
  if (regra.origem === 'implicita') {
    return `IMP-${slugify(regra.titulo).slice(0, 40).toUpperCase()}-${shortHash(funcionalidadeNome + regra.titulo)}`;
  }
  return `PROV-${shortHash(normalizeTitle(regra.titulo))}`;
}
