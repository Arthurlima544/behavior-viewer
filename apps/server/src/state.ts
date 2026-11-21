import type { AppConfig } from './config.js';
import { buildSnapshot, type ReportStamp } from './snapshot.js';
import type { Snapshot } from './model.js';
import type { Store } from './store.js';

import type { Logger } from 'pino';
import { calcularAtualizacoes, diferencas, marcacoesDe } from './atualizacoes.js';
import { hashesDaPasta } from './scanner/assinaturas.js';

/** Mudanças detectadas na pasta de testes, ainda não sincronizadas (o usuário precisa clicar em Sincronizar). */
export interface Pendencia {
  novos: string[];
  alterados: string[];
  removidos: string[];
  detectadoEm: string;
}

export type { Logger };

/** Estado vivo da aplicação: último snapshot e varredura em andamento (RF-50). */
export class AppState {
  private current: Snapshot | null = null;
  private inFlight: Promise<Snapshot> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private detectando = false;
  /** Projetos com mudanças na pasta de testes que ainda não foram sincronizados. */
  readonly pendencias = new Map<string, Pendencia>();
  /** Caminho absoluto de cada projeto. Interno: não é exposto pela API. */
  roots = new Map<string, string>();

  constructor(
    private readonly config: AppConfig,
    private readonly store: Store,
    private readonly log: Logger
  ) {}

  get snapshot(): Snapshot | null {
    return this.current;
  }

  get scanning(): boolean {
    return this.inFlight !== null;
  }

  /** Dispara uma varredura, ou reaproveita a que já está em andamento. */
  refresh(): Promise<Snapshot> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.run().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async run(): Promise<Snapshot> {
    const started = Date.now();
    const registrados = this.store.registeredList().map((r) => ({ root: r.caminho }));
    const result = await buildSnapshot(this.config, registrados);
    const { reportStamps, raizes, ...snapshot } = result;
    // Linha de base: na primeira varredura de um projeto, a pasta atual vira a versão vista.
    for (const p of snapshot.projetos) {
      const contadores = { regras: p.contadores.regras, cenarios: p.contadores.cenarios };
      let base = this.store.getBaseline(p.id);
      if (!base) {
        base = { arquivos: p.arquivosHash, contadores, vistoEm: new Date().toISOString(), mapas: p.mapas };
        this.store.setBaseline(p.id, base);
      }
      p.atualizacoes = calcularAtualizacoes({ arquivos: p.arquivosHash, contadores }, base);
      // Linha de base antiga, sem mapas: completa só se a pasta não mudou, para não marcar tudo como novo.
      if (!base.mapas && !p.atualizacoes.pendentes) {
        base = { ...base, mapas: p.mapas };
        this.store.setBaseline(p.id, base);
      }
      // Marcação de novo/alterado por regra e por cenário, desde a última vez que o usuário viu.
      const marcas = marcacoesDe(p.mapas, base);
      for (const r of p.regras) {
        r.marcacao = marcas.regras[r.id] ?? null;
        for (const i of r.implementacoes) {
          for (const c of i.cenarios) c.marcacao = marcas.cenarios[c.chave] ?? null;
        }
      }
    }
    for (const stamp of reportStamps) this.recordHistory(stamp);
    this.current = snapshot;
    // Após uma sincronização, os dados exibidos são os atuais: não há mais pendências.
    this.pendencias.clear();
    this.roots = raizes;
    this.log.info(
      {
        evento: 'varredura',
        projetos: snapshot.projetos.length,
        erros: snapshot.erros.length,
        duracaoMs: Date.now() - started,
      },
      'varredura concluída'
    );
    return snapshot;
  }

  private recordHistory(stamp: ReportStamp): void {
    this.store.recordIfChanged(
      stamp.projetoId,
      stamp.stack,
      stamp.fingerprint,
      stamp.regras,
      stamp.ultimaExecucao ?? new Date().toISOString()
    );
  }

  /**
   * Detecta mudanças nas pastas de testes e as registra como pendências. Não altera os dados exibidos:
   * isso só acontece na sincronização, feita pelo usuário.
   */
  async detectar(): Promise<void> {
    if (!this.current || this.inFlight || this.detectando) return;
    this.detectando = true;
    try {
      for (const p of this.current.projetos) {
        const root = this.roots.get(p.id);
        if (!root) continue;
        const atuais = await hashesDaPasta(root);
        const d = diferencas(p.arquivosHash, atuais);
        if (d.novos.length + d.alterados.length + d.removidos.length > 0) {
          this.pendencias.set(p.id, { ...d, detectadoEm: new Date().toISOString() });
        } else {
          this.pendencias.delete(p.id);
        }
      }
    } catch (err) {
      this.log.error({ err }, 'falha na detecção de mudanças');
    } finally {
      this.detectando = false;
    }
  }

  startSchedule(): void {
    if (this.config.scanIntervalSeconds <= 0) return;
    this.timer = setInterval(() => {
      void this.detectar();
    }, this.config.scanIntervalSeconds * 1000);
    this.timer.unref();
  }

  stopSchedule(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
