import { existsSync, promises as fsp } from 'node:fs';
import { dirname, join } from 'node:path';
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import fastifyStatic from '@fastify/static';
import {
  STACK_LABEL,
  STACKS,
  normalizeTitle,
  type RuleStatus,
  type Stack,
} from '@behavior-viewer/domain';
import type { AppConfig } from '../config.js';
import { ApiError } from '../errors.js';
import { descobrirProjetos } from '../candidates.js';
import { displayPath, isInside, resolveAllowed } from '../paths.js';
import { discoverFeatures } from '../scanner/discover.js';
import { hasManifest } from '../scanner/manifests.js';
import { projectId } from '../snapshot.js';
import { lastCommitOf } from '../git.js';
import type { ProjetoModel, RegraModel, Snapshot } from '../model.js';
import { HISTORY_SIZE, type Store } from '../store.js';
import type { AppState } from '../state.js';
import { gherkinOf } from './gherkin.js';
import { createReadStream } from 'node:fs';
import { caminhoCapturaValido } from '../screens.js';

export interface AppDeps {
  config: AppConfig;
  logger: FastifyBaseLogger;
  state: AppState;
  store: Store;
  version: string;
  /** Pasta com o build da SPA (apps/web/dist). */
  webDir: string;
}


const STATUS_VALUES: RuleStatus[] = [
  'passando',
  'falhando',
  'pendente',
  'sem-execucao',
  'sem-cobertura',
];

/** Caminho real de uma pasta, ou o próprio caminho se não puder ser resolvido. */
async function realOrSelf(path: string): Promise<string> {
  return fsp.realpath(path).catch(() => path);
}

/** Pasta que parece a raiz de um projeto: tem .git, .behavior.yml ou manifesto de stack. */
async function pareceProjeto(dir: string): Promise<boolean> {
  if (existsSync(join(dir, '.git')) || existsSync(join(dir, '.behavior.yml'))) return true;
  return hasManifest(dir);
}

/** Resumo de um projeto para as listas da interface. */
function resumoProjeto(p: ProjetoModel, selection: Map<string, boolean>) {
  return {
    id: p.id,
    atualizacoes: p.atualizacoes,
    nome: p.nome,
    descricao: p.descricao,
    caminho: p.caminho,
    origem: p.origem,
    selecionado: selection.get(p.id) !== false,
    stacks: p.stacks.map((s) => ({
      id: s.id,
      rotulo: STACK_LABEL[s.id],
      caminho: s.caminho,
      arquivos: s.arquivos,
    })),
    ref: p.ref,
    sincronizadoEm: p.sincronizadoEm,
    contadores: p.contadores,
    status: p.status,
    divergencias: p.divergencias.length,
    avisos: p.avisos,
  };
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: deps.logger,
    bodyLimit: 64 * 1024,
  });

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    if (err instanceof ApiError) {
      return reply.code(err.status).send({ erro: { codigo: err.codigo, mensagem: err.message } });
    }
    const status = err.statusCode ?? 500;
    if (status < 500) {
      return reply
        .code(status)
        .send({ erro: { codigo: 'requisicao-invalida', mensagem: err.message } });
    }
    app.log.error({ err }, 'erro interno');
    return reply
      .code(500)
      .send({ erro: { codigo: 'erro-interno', mensagem: 'erro interno do servidor' } });
  });

  const api = '/api/v1';
  const gitCache = new Map<
    string,
    { value: { commit: string; data: string } | null; at: number }
  >();

  function snapshotOrFail(): Snapshot {
    const snap = deps.state.snapshot;
    if (!snap)
      throw new ApiError(503, 'varredura-pendente', 'a primeira varredura ainda não terminou');
    return snap;
  }

  function isSelected(projetoId: string, selection: Map<string, boolean>): boolean {
    return selection.get(projetoId) !== false;
  }

  function visibleProjects(snap: Snapshot): ProjetoModel[] {
    const selection = deps.store.selectionMap();
    return snap.projetos.filter((p) => isSelected(p.id, selection));
  }

  function projectOrFail(snap: Snapshot, id: string): ProjetoModel {
    const p = snap.projetos.find((x) => x.id === id);
    if (!p) throw new ApiError(404, 'projeto-nao-encontrado', `projeto "${id}" não encontrado`);
    return p;
  }

  function ruleOrFail(projeto: ProjetoModel, id: string): RegraModel {
    const r = projeto.regras.find((x) => x.id === id);
    if (!r)
      throw new ApiError(404, 'regra-nao-encontrada', `regra "${id}" não encontrada no projeto`);
    return r;
  }

  async function gitLastCommit(projectRoot: string, fileRel: string) {
    const key = `${projectRoot}\u0000${fileRel}`;
    const hit = gitCache.get(key);
    if (hit && Date.now() - hit.at < 60_000) return hit.value;
    const value = await lastCommitOf(projectRoot, fileRel);
    gitCache.set(key, { value, at: Date.now() });
    return value;
  }

  function projectRootOf(projeto: ProjetoModel): string {
    return deps.state.roots.get(projeto.id) ?? '';
  }

  function paddedHistory(projetoId: string, stack: Stack, regraId: string) {
    const entries = deps.store.history(projetoId, stack, regraId);
    const pad = Array.from({ length: Math.max(0, HISTORY_SIZE - entries.length) }, () => ({
      status: 'sem-execucao' as RuleStatus,
      executadoEm: null as string | null,
    }));
    return [...pad, ...entries];
  }

  // ---- Saúde e visão geral -------------------------------------------------

  app.get(`${api}/health`, async () => {
    const snap = deps.state.snapshot;
    return {
      status: 'ok',
      versao: deps.version,
      emVarredura: deps.state.scanning,
      ultimaVarredura: snap?.geradoEm ?? null,
      duracaoMs: snap?.duracaoMs ?? null,
      projetos: snap?.projetos.length ?? 0,
    };
  });

  /** Varredura completa e síncrona: só responde depois de reler todos os projetos registrados. */
  app.post(`${api}/varreduras`, async () => {
    const snap = await deps.state.refresh();
    return { status: 'concluida', geradoEm: snap.geradoEm, duracaoMs: snap.duracaoMs, projetos: snap.projetos.length };
  });

  app.get(`${api}/visao-geral`, async () => {
    const snap = snapshotOrFail();
    const visible = visibleProjects(snap);
    const regras = visible.reduce((s, p) => s + p.contadores.regras, 0);
    const funcionalidades = visible.reduce((s, p) => s + p.contadores.funcionalidades, 0);
    const cenarios = visible.reduce((s, p) => s + p.contadores.cenarios, 0);
    const passando = visible.reduce((s, p) => s + p.status.passando, 0);
    return {
      projetos: visible.length,
      regras,
      funcionalidades,
      cenarios,
      percentualPassando: regras === 0 ? 0 : Math.round((passando / regras) * 100),
      ultimaVarredura: snap.geradoEm,
    };
  });

  // ---- Navegação de pastas e registro de projetos -------------------------

  /** Lista pastas dentro das raízes permitidas, para o usuário escolher um projeto. */
  app.get<{ Querystring: { caminho?: string } }>(`${api}/sistema/pastas`, async (req) => {
    const roots = deps.config.browseRoots;
    const label = deps.config.browseLabel;
    if (!req.query.caminho) {
      return {
        caminho: null,
        exibicao: label,
        pai: null,
        itens: await Promise.all(
          roots.map(async (r) => ({
            nome: label,
            caminho: await realOrSelf(r),
            ehProjeto: false,
          })),
        ),
      };
    }
    const real = await resolveAllowed(req.query.caminho, roots, label);
    const entries = await fsp.readdir(real, { withFileTypes: true }).catch(() => {
      throw new ApiError(403, 'sem-permissao', 'sem permissão para listar esta pasta');
    });
    const itens: { nome: string; caminho: string; ehProjeto: boolean }[] = [];
    for (const entry of entries.slice(0, 2000)) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const full = join(real, entry.name);
      itens.push({ nome: entry.name, caminho: full, ehProjeto: await pareceProjeto(full) });
    }
    itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const parent = dirname(real);
    const raizAtual = roots.find((r) => isInside(real, r));
    const pai = raizAtual && parent !== real && isInside(parent, raizAtual) ? parent : null;
    return {
      caminho: real,
      exibicao: displayPath(real, roots, label),
      pai,
      ehProjeto: await pareceProjeto(real),
      itens: itens.slice(0, 1000),
    };
  });

  /** Identifica os projetos de uma pasta escolhida, sem registrar nada ainda (RF-01, RF-03). */
  app.post<{ Body: { caminho?: unknown } }>(`${api}/descobertas`, async (req) => {
    const real = await resolveAllowed(req.body?.caminho, deps.config.browseRoots, deps.config.browseLabel);
    const registrados = new Set(deps.store.registeredList().map((r) => r.id));
    const resultado = await descobrirProjetos(real, {
      roots: deps.config.browseRoots,
      label: deps.config.browseLabel,
      registrados,
    });
    return { pasta: displayPath(real, deps.config.browseRoots, deps.config.browseLabel), ...resultado };
  });

  /** Registra um projeto (RF-02). A pasta precisa conter pelo menos um `.feature`. */
  app.post<{ Body: { caminho?: unknown } }>(`${api}/projetos`, async (req, reply) => {
    const real = await resolveAllowed(req.body?.caminho, deps.config.browseRoots, deps.config.browseLabel);
    const id = projectId(real);
    if (deps.store.registeredList().some((r) => r.id === id)) {
      throw new ApiError(409, 'projeto-ja-registrado', 'este projeto já está registrado');
    }
    const discovery = await discoverFeatures(real, { maxEntries: 200_000, deadlineMs: 20_000 });
    if (discovery.features.length === 0) {
      throw new ApiError(
        422,
        'sem-bdd',
        'nenhum arquivo .feature encontrado nesta pasta. Escolha a pasta raiz do projeto ou de uma das suas stacks.',
      );
    }
    deps.store.registerProject(id, real);
    await deps.state.refresh();
    const projeto = deps.state.snapshot?.projetos.find((p) => p.id === id);
    return reply.code(201).send(projeto ? resumoProjeto(projeto, deps.store.selectionMap()) : { id });
  });

  /** Marca o projeto como visto: a pasta atual vira a linha de base e o aviso de atualizações some. */
  app.post<{ Params: { id: string } }>(`${api}/projetos/:id/visto`, async (req) => {
    const p = projectOrFail(snapshotOrFail(), req.params.id);
    deps.store.setBaseline(p.id, {
      arquivos: p.arquivosHash,
      contadores: { regras: p.contadores.regras, cenarios: p.contadores.cenarios },
      vistoEm: new Date().toISOString(),
    });
    await deps.state.refresh();
    const atual = deps.state.snapshot?.projetos.find((x) => x.id === p.id);
    return { id: p.id, atualizacoes: atual?.atualizacoes ?? null };
  });

  /** Remove o registro do projeto e seu histórico. Os arquivos do usuário nunca são tocados. */
  app.delete<{ Params: { id: string } }>(`${api}/projetos/:id`, async (req, reply) => {
    const removido = deps.store.unregisterProject(req.params.id);
    if (!removido) throw new ApiError(404, 'projeto-nao-encontrado', 'projeto não registrado');
    await deps.state.refresh();
    return reply.code(204).send();
  });

  /** Estrutura identificada do projeto: stacks, funcionalidades por arquivo e testes BDD (RF-03, RF-04). */
  app.get<{ Params: { id: string } }>(`${api}/projetos/:id/estrutura`, async (req) => {
    const p = projectOrFail(snapshotOrFail(), req.params.id);
    const porArquivo = new Map<string, { stack: Stack; arquivo: string; regras: number; cenarios: number }>();
    for (const r of p.regras) {
      for (const i of r.implementacoes) {
        const key = `${i.stack}|${i.arquivo}`;
        const atual = porArquivo.get(key) ?? { stack: i.stack, arquivo: i.arquivo, regras: 0, cenarios: 0 };
        atual.regras++;
        atual.cenarios += i.cenarios.length;
        porArquivo.set(key, atual);
      }
    }
    const arquivosFeature = p.funcionalidades.flatMap((f) =>
      f.arquivos.map((a) => ({
        funcionalidade: f.nome,
        stack: a.stack,
        rotulo: STACK_LABEL[a.stack],
        arquivo: a.arquivo,
        idioma: a.idioma,
        regras: porArquivo.get(`${a.stack}|${a.arquivo}`)?.regras ?? 0,
        cenarios: porArquivo.get(`${a.stack}|${a.arquivo}`)?.cenarios ?? 0,
      })),
    );
    arquivosFeature.sort((a, b) => a.funcionalidade.localeCompare(b.funcionalidade, 'pt-BR') || a.arquivo.localeCompare(b.arquivo));
    return {
      projeto: { id: p.id, nome: p.nome, caminho: p.caminho, origem: p.origem, descricao: p.descricao },
      stacks: p.stacks.map((s) => ({
        id: s.id,
        rotulo: STACK_LABEL[s.id],
        caminho: s.caminho,
        arquivos: s.arquivos,
        relatorios: s.relatorios,
        runner: RUNNER_LABEL[s.id],
      })),
      telas: p.telas,
      testes: {
        arquivosFeature: arquivosFeature.length,
        funcionalidades: p.funcionalidades.length,
        regras: p.contadores.regras,
        cenarios: p.contadores.cenarios,
      },
      funcionalidades: arquivosFeature,
      erros: snapshotOrFail().erros.filter((e) => e.projetoId === p.id),
    };
  });

  // ---- Projetos ------------------------------------------------------------

  app.get(`${api}/projetos`, async () => {
    const snap = snapshotOrFail();
    const selection = deps.store.selectionMap();
    return { items: snap.projetos.map((p) => resumoProjeto(p, selection)) };
  });

  app.put<{ Params: { id: string }; Body: { selecionado?: unknown } }>(
    `${api}/projetos/:id/selecao`,
    async (req) => {
      const snap = snapshotOrFail();
      projectOrFail(snap, req.params.id);
      if (typeof req.body?.selecionado !== 'boolean') {
        throw new ApiError(400, 'corpo-invalido', 'informe { "selecionado": true|false }');
      }
      deps.store.setSelection(req.params.id, req.body.selecionado);
      return { id: req.params.id, selecionado: req.body.selecionado };
    }
  );

  app.get<{ Params: { id: string } }>(`${api}/projetos/:id/funcionalidades`, async (req) => {
    const p = projectOrFail(snapshotOrFail(), req.params.id);
    return {
      items: p.funcionalidades.map((f) => ({
        key: f.key,
        nome: f.nome,
        descricao: f.descricao,
        tags: f.tags,
        arquivos: f.arquivos,
        regras: f.regras.length,
        cenarios: p.regras
          .filter((r) => f.regras.includes(r.id))
          .reduce((s, r) => s + r.cenariosCount, 0),
      })),
    };
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      q?: string;
      stack?: string;
      status?: string;
      tag?: string;
      divergentes?: string;
      funcionalidade?: string;
    };
  }>(`${api}/projetos/:id/regras`, async (req) => {
    const p = projectOrFail(snapshotOrFail(), req.params.id);
    const { q, stack, status, tag, divergentes, funcionalidade } = req.query;

    if (stack && !(STACKS as readonly string[]).includes(stack)) {
      throw new ApiError(400, 'filtro-invalido', `stack desconhecida: ${stack}`);
    }
    if (status && !STATUS_VALUES.includes(status as RuleStatus)) {
      throw new ApiError(400, 'filtro-invalido', `status desconhecido: ${status}`);
    }

    const needle = q ? normalizeTitle(q) : '';
    const divergentIds = new Set(p.divergencias.map((d) => d.regraId));
    const items = p.regras
      .filter((r) => !funcionalidade || r.funcionalidadeKey === funcionalidade)
      .filter((r) => !stack || r.implementacoes.some((i) => i.stack === stack))
      .filter((r) => !status || statusNaStack(r, stack) === status)
      .filter((r) => !tag || r.tags.includes(tag))
      .filter((r) => divergentes !== 'true' || divergentIds.has(r.id))
      .filter((r) => {
        if (!needle) return true;
        const hay = normalizeTitle(`${r.id} ${r.titulo} ${r.tags.join(' ')}`);
        return hay.includes(needle);
      })
      .map((r) => resumoRegra(r, p));

    return { projeto: p.id, total: items.length, items };
  });

  app.get<{ Params: { id: string } }>(`${api}/projetos/:id/matriz`, async (req) => {
    const p = projectOrFail(snapshotOrFail(), req.params.id);
    return {
      stacks: p.stacks.map((s) => ({ id: s.id, rotulo: STACK_LABEL[s.id] })),
      linhas: p.matriz,
    };
  });

  app.get<{ Params: { id: string } }>(`${api}/projetos/:id/divergencias`, async (req) => {
    const p = projectOrFail(snapshotOrFail(), req.params.id);
    return {
      total: p.divergencias.length,
      items: p.divergencias.map((d) => ({
        ...d,
        rotuloPresentes: d.presentes.map((s) => STACK_LABEL[s]),
        rotuloAusentes: d.ausentes.map((s) => STACK_LABEL[s]),
      })),
    };
  });

  // ---- Regras --------------------------------------------------------------

  /** Imagem de captura de tela de um projeto. Só serve arquivos dentro da pasta do projeto (docs/prompts). */
  app.get<{ Querystring: { projeto?: string; arquivo?: string } }>(`${api}/capturas`, async (req, reply) => {
    const snap = snapshotOrFail();
    const projeto = projectOrFail(snap, req.query.projeto ?? '');
    const arquivo = req.query.arquivo ?? '';
    if (!caminhoCapturaValido(arquivo)) {
      throw new ApiError(400, 'captura-invalida', 'caminho de captura inválido');
    }
    const root = deps.state.roots.get(projeto.id);
    if (!root) throw new ApiError(404, 'captura-nao-encontrada', 'pasta do projeto não encontrada');
    const rootReal = await fsp.realpath(root).catch(() => root);
    const real = await fsp.realpath(join(root, arquivo)).catch(() => null);
    if (!real) throw new ApiError(404, 'captura-nao-encontrada', 'captura não encontrada');
    if (!isInside(real, rootReal)) {
      throw new ApiError(403, 'fora-do-projeto', 'a captura está fora da pasta do projeto');
    }
    const stat = await fsp.stat(real);
    if (!stat.isFile()) throw new ApiError(404, 'captura-nao-encontrada', 'captura não encontrada');
    if (stat.size > MAX_CAPTURA_BYTES) throw new ApiError(413, 'captura-grande', 'captura maior que o limite');
    reply.type(mimeDe(real));
    reply.header('Cache-Control', 'private, max-age=60');
    return reply.send(createReadStream(real));
  });

  app.get<{ Params: { id: string }; Querystring: { projeto?: string } }>(
    `${api}/regras/:id`,
    async (req) => {
      const snap = snapshotOrFail();
      const projeto = resolveRuleProject(snap, req.params.id, req.query.projeto);
      const r = ruleOrFail(projeto, req.params.id);
      const root = projectRootOf(projeto);

      const implementacoes = await Promise.all(
        r.implementacoes.map(async (i) => {
          const commit = root ? await gitLastCommit(root, i.arquivo) : null;
          return {
            stack: i.stack,
            rotulo: STACK_LABEL[i.stack],
            arquivo: i.arquivo,
            linha: i.linha,
            funcionalidade: i.funcionalidade,
            status: i.status,
            runner: RUNNER_LABEL[i.stack],
            cenarios: i.cenarios.map((c) => ({
              ...c,
              capturas: c.capturas.map((k) => ({ ...k, url: capturaUrl(projeto.id, k.arquivo) })),
            })),
            ultimaExecucao: i.ultimaExecucao,
            ultimaAlteracao: commit,
          };
        })
      );
      const presentes = new Set(r.implementacoes.map((i) => i.stack));
      const funcionalidade = projeto.funcionalidades.find((f) => f.key === r.funcionalidadeKey);

      return {
        id: r.id,
        origem: r.origem,
        titulo: r.titulo,
        descricao: r.descricao,
        situacao: r.situacao,
        resultado: r.resultado,
        tags: r.tags,
        avisos: r.avisos,
        telas: r.telas,
        componentes: r.componentes,
        status: r.status,
        projeto: { id: projeto.id, nome: projeto.nome, ref: projeto.ref },
        funcionalidade: funcionalidade
          ? {
              key: funcionalidade.key,
              nome: funcionalidade.nome,
              descricao: funcionalidade.descricao,
              arquivos: funcionalidade.arquivos,
            }
          : null,
        implementacoes,
        ausentes: projeto.stacks
          .map((s) => s.id)
          .filter((s) => !presentes.has(s))
          .map((s) => ({ stack: s, rotulo: STACK_LABEL[s] })),
        historico: projeto.stacks.map((s) => ({
          stack: s.id,
          rotulo: STACK_LABEL[s.id],
          execucoes: paddedHistory(projeto.id, s.id, r.id),
        })),
      };
    }
  );

  app.get<{ Params: { id: string }; Querystring: { projeto?: string; stack?: string } }>(
    `${api}/regras/:id/gherkin`,
    async (req, reply) => {
      const snap = snapshotOrFail();
      const projeto = resolveRuleProject(snap, req.params.id, req.query.projeto);
      const r = ruleOrFail(projeto, req.params.id);
      const impl = req.query.stack
        ? r.implementacoes.find((i) => i.stack === req.query.stack)
        : r.implementacoes[0];
      if (!impl)
        throw new ApiError(404, 'implementacao-nao-encontrada', 'a regra não existe nesta stack');
      reply.type('text/plain; charset=utf-8');
      return gherkinOf(r, impl.stack);
    }
  );

  app.get<{ Querystring: { q?: string } }>(`${api}/busca`, async (req) => {
    const snap = snapshotOrFail();
    const needle = normalizeTitle(req.query.q ?? '');
    if (!needle) return { total: 0, items: [] };
    const items: {
      id: string;
      titulo: string;
      projetoId: string;
      projetoNome: string;
      funcionalidade: string;
      status: RuleStatus;
    }[] = [];
    for (const p of visibleProjects(snap)) {
      for (const r of p.regras) {
        if (normalizeTitle(`${r.id} ${r.titulo} ${r.tags.join(' ')}`).includes(needle)) {
          items.push({
            id: r.id,
            titulo: r.titulo,
            projetoId: p.id,
            projetoNome: p.nome,
            funcionalidade: r.funcionalidadeNome,
            status: r.status,
          });
        }
      }
    }
    return { total: items.length, items: items.slice(0, 50) };
  });

  app.get(`${api}/erros`, async () => {
    const snap = snapshotOrFail();
    return { total: snap.erros.length, items: snap.erros };
  });

  // ---- SPA -----------------------------------------------------------------

  const hasWeb = existsSync(join(deps.webDir, 'index.html'));
  if (hasWeb) {
    await app.register(fastifyStatic, { root: deps.webDir, prefix: '/' });
    app.setNotFoundHandler(async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.method === 'GET' && !req.url.startsWith(`${api}/`)) {
        return reply.type('text/html; charset=utf-8').sendFile('index.html');
      }
      return reply
        .code(404)
        .send({ erro: { codigo: 'nao-encontrado', mensagem: 'rota não encontrada' } });
    });
  } else {
    app.get('/', async () => ({
      mensagem:
        'Behavior Viewer API. A interface ainda não foi compilada (npm run build -w apps/web).',
    }));
  }

  return app;
}

/** Tamanho máximo servido para uma captura (evita carregar arquivos gigantes). */
const MAX_CAPTURA_BYTES = 15 * 1024 * 1024;

function capturaUrl(projetoId: string, arquivo: string): string {
  return `/api/v1/capturas?projeto=${encodeURIComponent(projetoId)}&arquivo=${encodeURIComponent(arquivo)}`;
}

function mimeDe(caminho: string): string {
  const ext = caminho.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/png';
  }
}

const RUNNER_LABEL: Record<Stack, string> = {
  flutter: 'Flutter (BDD)',
  typescript: 'Cucumber.js',
  java: 'Cucumber-JVM',
  'gherkin-generico': 'Gherkin',
};

function resolveRuleProject(snap: Snapshot, ruleId: string, projetoId?: string): ProjetoModel {
  if (projetoId) {
    const p = snap.projetos.find((x) => x.id === projetoId);
    if (!p)
      throw new ApiError(404, 'projeto-nao-encontrado', `projeto "${projetoId}" não encontrado`);
    return p;
  }
  const found = snap.projetos.find((p) => p.regras.some((r) => r.id === ruleId));
  if (!found) throw new ApiError(404, 'regra-nao-encontrada', `regra "${ruleId}" não encontrada`);
  return found;
}

/** Status da regra na stack filtrada, ou o agregado quando nenhuma stack é escolhida (RF-31, RF-32). */
function statusNaStack(r: RegraModel, stack: string | undefined): RuleStatus {
  if (!stack) return r.status;
  return r.implementacoes.find((i) => i.stack === stack)?.status ?? 'sem-cobertura';
}

function resumoRegra(r: RegraModel, p: ProjetoModel) {
  const presentes = new Set(r.implementacoes.map((i) => i.stack));
  const divergente = p.divergencias.some((d) => d.regraId === r.id);
  return {
    id: r.id,
    origem: r.origem,
    titulo: r.titulo,
    tags: r.tags,
    status: r.status,
    funcionalidadeKey: r.funcionalidadeKey,
    funcionalidadeNome: r.funcionalidadeNome,
    cenarios: r.cenariosCount,
    avisos: r.avisos,
    divergente,
    presenca: p.stacks.map((s) => ({
      stack: s.id,
      rotulo: STACK_LABEL[s.id],
      presente: presentes.has(s.id),
      status: r.implementacoes.find((i) => i.stack === s.id)?.status ?? null,
    })),
  };
}
