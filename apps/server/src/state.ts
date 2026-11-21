import type { AppConfig } from './config.js';
import { buildSnapshot, type ReportStamp } from './snapshot.js';
import type { Snapshot } from './model.js';
import type { Store } from './store.js';

import type { Logger } from 'pino';

export type { Logger };

/** Estado vivo da aplicação: último snapshot e varredura em andamento (RF-50). */
export class AppState {
  private current: Snapshot | null = null;
  private inFlight: Promise<Snapshot> | null = null;
  private timer: NodeJS.Timeout | null = null;
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
    for (const stamp of reportStamps) this.recordHistory(stamp);
    this.current = snapshot;
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

  startSchedule(): void {
    if (this.config.scanIntervalSeconds <= 0) return;
    this.timer = setInterval(() => {
      this.refresh().catch((err: unknown) => this.log.error({ err }, 'falha na varredura'));
    }, this.config.scanIntervalSeconds * 1000);
    this.timer.unref();
  }

  stopSchedule(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
