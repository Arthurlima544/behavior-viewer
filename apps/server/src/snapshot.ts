import { promises as fs } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import {
  aggregateStatus,
  buildCoverageMatrix,
  findDivergences,
  shortHash,
  slugify,
  summarizeStatuses,
  worstRuleStatus,
  type RuleStatus,
  type Stack,
} from '@behavior-viewer/domain';
import type { AppConfig } from './config.js';
import { displayPath } from './paths.js';
import { discoverFeatures, isIgnored, resolveStack, type FeatureFileRef } from './scanner/discover.js';
import { readProjectConfig, type ProjectConfig } from './scanner/projectConfig.js';
import { loadReports, type LoadedReports } from './scanner/reports.js';
import {
  consolidationKey,
  displayRuleId,
  parseFeatureSource,
  type FuncionalidadeParsed,
  type RegraParsed,
} from './parser/feature.js';
import { readGitRef } from './git.js';
import type {
  CenarioModel,
  ErroModel,
  FuncionalidadeModel,
  ImplementacaoModel,
  ProjetoModel,
  RegraModel,
  Snapshot,
  StackModel,
} from './model.js';

interface FeatureEntry {
  stack: Stack;
  stackDirRel: string;
  fileRel: string;
  fileWorkspaceRel: string;
  parsed: FuncionalidadeParsed;
}

interface ProjectAcc {
  root: string;
  config: ProjectConfig | null;
  features: FeatureEntry[];
}

interface ImplDraft {
  key: string;
  regra: RegraParsed;
  id: string;
  stack: Stack;
  arquivo: string;
  linha: number;
  funcionalidadeNome: string;
  funcionalidadeDescricao: string;
  funcionalidadeTags: string[];
  cenarios: CenarioModel[];
  status: RuleStatus;
  ultimaExecucao: string | null;
}

/** Projeto registrado pelo usuário: a pasta é a raiz do projeto. */
export interface ProjetoRegistrado {
  /** Caminho real da pasta do projeto. */
  root: string;
}

/**
 * Monta o snapshot dos projetos registrados (RF-01 a RF-26). Cada projeto registrado é uma
 * unidade: as stacks são detectadas dentro dele e as funcionalidades são os `.feature` encontrados.
 */
export async function buildSnapshot(
  config: AppConfig,
  registrados: ProjetoRegistrado[],
): Promise<Snapshot & { reportStamps: ReportStamp[]; raizes: Map<string, string> }> {
  const started = Date.now();
  const erros: ErroModel[] = [];
  const accs = new Map<string, ProjectAcc>();
  const reportStamps: ReportStamp[] = [];
  const raizes = new Map<string, string>();

  for (const { root } of registrados) {
    const id = projectId(root);
    let discovery;
    try {
      discovery = await discoverFeatures(root, { maxEntries: 500_000, deadlineMs: 60_000 });
    } catch (err) {
      erros.push({
        projetoId: id,
        arquivo: root,
        linha: null,
        tipo: 'feature',
        mensagem: `pasta não acessível: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    const read = await readProjectConfig(root);
    if (read.error) {
      erros.push({ projetoId: id, arquivo: '.behavior.yml', linha: null, tipo: 'config', mensagem: read.error });
    }
    const config = read.config;
    accs.set(root, { root, config, features: [] });

    for (const feature of discovery.features) {
      const fileRel = relative(root, feature.absPath).split(sep).join('/');
      if (config && isIgnored(fileRel, config.ignorar)) continue;
      await collectFeature(feature, root, fileRel, config, accs, erros);
    }
    if (discovery.parcial) {
      erros.push({
        projetoId: id,
        arquivo: root,
        linha: null,
        tipo: 'feature',
        mensagem: 'varredura interrompida por limite de tempo ou de entradas: a lista pode estar incompleta',
      });
    }
  }

  const projetos: ProjetoModel[] = [];
  for (const [root, acc] of accs) {
    const { projeto, stamps } = await buildProject(root, acc, erros, config);
    projetos.push(projeto);
    raizes.set(projeto.id, root);
    reportStamps.push(...stamps);
  }
  projetos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    geradoEm: new Date().toISOString(),
    duracaoMs: Date.now() - started,
    projetos,
    erros,
    reportStamps,
    raizes,
  };
}

async function collectFeature(
  feature: FeatureFileRef,
  projectRoot: string,
  fileRel: string,
  config: ProjectConfig | null,
  accs: Map<string, ProjectAcc>,
  erros: ErroModel[],
): Promise<void> {
  const id = projectId(projectRoot);
  const { stack, stackDirRel } = await resolveStack(feature.absPath, projectRoot, config);

  let source: string;
  try {
    source = await fs.readFile(feature.absPath, 'utf8');
  } catch (err) {
    erros.push({
      projetoId: id,
      arquivo: fileRel,
      linha: null,
      tipo: 'feature',
      mensagem: `não foi possível ler o arquivo: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  const outcome = parseFeatureSource(source, fileRel);
  if (!outcome.ok) {
    for (const e of outcome.erros) {
      erros.push({ projetoId: id, arquivo: fileRel, linha: e.linha, tipo: 'feature', mensagem: e.mensagem });
    }
    return;
  }
  if (!outcome.funcionalidade) return;

  const acc = accs.get(projectRoot) as ProjectAcc;
  acc.features.push({
    stack,
    stackDirRel,
    fileRel,
    fileWorkspaceRel: fileRel,
    parsed: outcome.funcionalidade,
  });
}

/** ID estável do projeto: slug do nome da pasta + hash do caminho absoluto. */
export function projectId(projectRoot: string): string {
  return `${slugify(basename(projectRoot))}-${shortHash(projectRoot)}`;
}

export interface ReportStamp {
  projetoId: string;
  stack: Stack;
  fingerprint: string;
  ultimaExecucao: string | null;
  /** Resultado de cada regra da stack neste momento, para o histórico. */
  regras: { regraId: string; status: RuleStatus }[];
}

async function buildProject(
  root: string,
  acc: ProjectAcc,
  erros: ErroModel[],
  appConfig: AppConfig
): Promise<{ projeto: ProjetoModel; stamps: ReportStamp[] }> {
  const id = projectId(root);
  const nome = acc.config?.nome ?? basename(root);
  const origem = acc.config ? 'config' : 'auto';

  // Stacks: declaradas no config e detectadas nos arquivos.
  const stackDirs = new Map<Stack, string>();
  for (const s of acc.config?.stacks ?? []) stackDirs.set(s.id, s.caminho);
  for (const f of acc.features) {
    const current = stackDirs.get(f.stack);
    if (current === undefined || (f.stackDirRel.length < current.length && !acc.config)) {
      stackDirs.set(f.stack, f.stackDirRel);
    }
  }
  const stackOrder = [...stackDirs.keys()];

  // Relatórios por stack.
  const reportsByStack = new Map<Stack, LoadedReports>();
  const stackModels: StackModel[] = [];
  for (const stack of stackOrder) {
    const dirRel = stackDirs.get(stack) ?? '';
    const declared = acc.config?.stacks.find((s) => s.id === stack);
    const patterns = declared?.relatorios ?? [];
    const loaded = await loadReports(join(root, dirRel), patterns);
    reportsByStack.set(stack, loaded);
    for (const e of loaded.errors) {
      erros.push({
        projetoId: id,
        arquivo: e,
        linha: null,
        tipo: 'relatorio',
        mensagem: 'relatório inválido',
      });
    }
    stackModels.push({
      id: stack,
      caminho: dirRel,
      arquivos: acc.features.filter((f) => f.stack === stack).length,
      relatorios: loaded.files.map((f) => relative(root, f).split(sep).join('/')),
      ultimaExecucao: loaded.ultimaExecucao,
      fingerprint: loaded.fingerprint,
    });
  }

  // Implementações (uma por regra por arquivo de funcionalidade).
  const drafts: ImplDraft[] = [];
  const funcMap = new Map<string, FuncionalidadeModel>();
  for (const f of acc.features) {
    const featureKey = slugify(f.parsed.nome);
    const fm = funcMap.get(featureKey) ?? {
      key: featureKey,
      nome: f.parsed.nome,
      descricao: f.parsed.descricao,
      tags: [],
      arquivos: [],
      regras: [],
    };
    fm.arquivos.push({ stack: f.stack, arquivo: f.fileRel, idioma: f.parsed.idioma });
    fm.tags = [...new Set([...fm.tags, ...f.parsed.tags])];
    if (!fm.descricao && f.parsed.descricao) fm.descricao = f.parsed.descricao;
    funcMap.set(featureKey, fm);

    const reports = reportsByStack.get(f.stack);
    for (const regra of f.parsed.regras) {
      const cenarios: CenarioModel[] = regra.cenarios.map((c) => ({
        nome: c.nome,
        linha: c.linha,
        tipo: c.tipo,
        passos: c.passos.map((p) => ({ palavra: p.palavra, texto: p.texto })),
        exemplos: c.exemplos,
        resultado: reports ? reports.index.lookup(f.parsed.nome, c.nome) : 'sem-execucao',
      }));
      drafts.push({
        key: consolidationKey(regra, f.parsed.nome),
        regra,
        id: displayRuleId(regra, f.parsed.nome),
        stack: f.stack,
        arquivo: f.fileRel,
        linha: regra.linha,
        funcionalidadeNome: f.parsed.nome,
        funcionalidadeDescricao: f.parsed.descricao,
        funcionalidadeTags: f.parsed.tags,
        cenarios,
        status: aggregateStatus(cenarios.map((c) => c.resultado)),
        ultimaExecucao: reports?.ultimaExecucao ?? null,
      });
    }
  }

  const grouped = consolidate(drafts);
  const regras: RegraModel[] = [];
  for (const grupo of grouped) {
    // Ordem canônica das stacks: título, situação e resultado vêm da primeira stack do projeto.
    const group = [...grupo].sort((a, b) => stackRank(a.stack) - stackRank(b.stack));
    const first = group.find((d) => d.regra.idTag) ?? (group[0] as ImplDraft);
    const tagged = group.find((d) => d.regra.idTag);
    const id = tagged ? tagged.id : first.id;
    const origem = tagged ? 'tag' : first.regra.origem;
    const descricao = group.map((d) => d.regra.descricao).find((d) => d) ?? '';
    const situacao = group.map((d) => d.regra.situacao).find((d) => d) ?? null;
    const resultado = group.map((d) => d.regra.resultado).find((d) => d) ?? null;
    const implementacoes: ImplementacaoModel[] = group.map((d) => ({
      stack: d.stack,
      arquivo: d.arquivo,
      linha: d.linha,
      funcionalidade: d.funcionalidadeNome,
      status: d.status,
      cenarios: d.cenarios,
      ultimaExecucao: d.ultimaExecucao,
    }));
    const avisos = [...new Set(group.flatMap((d) => d.regra.avisos))];
    if (!tagged && group.length > 1)
      avisos.push('consolidada pelo título (sem ID em todas as stacks)');
    const tags = [...new Set([...first.funcionalidadeTags, ...group.flatMap((d) => d.regra.tags)])];

    regras.push({
      id,
      origem,
      titulo: first.regra.titulo,
      descricao,
      situacao,
      resultado,
      tags,
      avisos,
      funcionalidadeKey: slugify(first.funcionalidadeNome),
      funcionalidadeNome: first.funcionalidadeNome,
      status: worstRuleStatus(implementacoes.map((i) => i.status)),
      cenariosCount: Math.max(...group.map((d) => d.cenarios.length)),
      implementacoes,
    });
  }
  regras.sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));

  for (const rule of regras) {
    const fm = funcMap.get(rule.funcionalidadeKey);
    if (fm) fm.regras.push(rule.id);
  }
  const funcionalidades = [...funcMap.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );

  const coverageInput = regras.map((r) => ({
    ruleId: r.id,
    featureKey: r.funcionalidadeKey,
    featureName: r.funcionalidadeNome,
    stacks: r.implementacoes.map((i) => i.stack),
  }));
  const matriz = buildCoverageMatrix(coverageInput, stackOrder).map((row) => ({
    funcionalidadeKey: row.featureKey,
    funcionalidadeNome: row.featureName,
    total: row.total,
    celulas: row.cells.map((c) => ({
      stack: c.stack,
      covered: c.covered,
      total: c.total,
      complete: c.complete,
    })),
  }));
  const divergencias = findDivergences(coverageInput, stackOrder).map((d) => ({
    regraId: d.ruleId,
    funcionalidadeKey: d.featureKey,
    funcionalidadeNome: d.featureName,
    presentes: d.presentIn,
    ausentes: d.missingIn,
  }));

  const cenarios = regras.reduce(
    (sum, r) => sum + r.implementacoes.reduce((s, i) => s + i.cenarios.length, 0),
    0
  );
  const stamps: ReportStamp[] = stackOrder.map((stack) => {
    const loaded = reportsByStack.get(stack) as LoadedReports;
    return {
      projetoId: id,
      stack,
      fingerprint: loaded.fingerprint,
      ultimaExecucao: loaded.ultimaExecucao,
      regras: regras
        .filter((r) => r.implementacoes.some((i) => i.stack === stack))
        .map((r) => ({
          regraId: r.id,
          status: r.implementacoes.find((i) => i.stack === stack)?.status ?? 'sem-execucao',
        })),
    };
  });

  const projeto: ProjetoModel = {
    id,
    nome,
    descricao: acc.config?.descricao ?? '',
    caminho: displayPath(root, appConfig.browseRoots, appConfig.browseLabel),
    origem,
    stacks: stackModels,
    ref: await readGitRef(root),
    sincronizadoEm: new Date().toISOString(),
    contadores: { regras: regras.length, funcionalidades: funcionalidades.length, cenarios },
    status: summarizeStatuses(regras.map((r) => r.status)),
    funcionalidades,
    regras,
    matriz,
    divergencias,
    avisos: regras.filter((r) => r.avisos.length > 0).length,
  };
  return { projeto, stamps };
}

/**
 * Agrupa implementações por chave de consolidação (RF-13). Grupos "por título" são fundidos
 * ao grupo com ID de mesmo título normalizado, para que uma stack sem tag não fique separada.
 */
function consolidate(drafts: ImplDraft[]): ImplDraft[][] {
  const groups = new Map<string, ImplDraft[]>();
  for (const d of drafts) {
    const list = groups.get(d.key) ?? [];
    list.push(d);
    groups.set(d.key, list);
  }

  const idGroupByTitle = new Map<string, string>();
  for (const [key, list] of groups) {
    if (key.startsWith('id:')) {
      const first = list[0] as ImplDraft;
      idGroupByTitle.set(normalizeKey(first.regra.titulo), key);
    }
  }

  for (const [key, list] of [...groups]) {
    if (!key.startsWith('titulo:')) continue;
    const target = idGroupByTitle.get(key.slice('titulo:'.length));
    if (!target) continue;
    const targetList = groups.get(target) as ImplDraft[];
    targetList.push(...list);
    groups.delete(key);
  }

  return [...groups.values()];
}

function normalizeKey(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RANK: Record<Stack, number> = { flutter: 0, typescript: 1, java: 2, 'gherkin-generico': 3 };
function stackRank(stack: Stack): number {
  return RANK[stack];
}
