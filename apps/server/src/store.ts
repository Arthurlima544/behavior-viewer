import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import type { RuleStatus, Stack } from '@behavior-viewer/domain';
import type { LinhaDeBase } from './atualizacoes.js';

/** Quantas execuções por regra e stack são mantidas (RF-20). */
export const HISTORY_SIZE = 14;

export interface HistoryEntry {
  status: RuleStatus;
  executadoEm: string;
}

/** Persistência local: seleção de projetos, assinatura de relatórios e histórico (RNF-14). */
export class Store {
  private readonly db: Database.Database;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projeto_selecao (
        projeto_id TEXT PRIMARY KEY,
        selecionado INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sincronizacao_stack (
        projeto_id TEXT NOT NULL,
        stack TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        PRIMARY KEY (projeto_id, stack)
      );
      CREATE TABLE IF NOT EXISTS execucao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projeto_id TEXT NOT NULL,
        stack TEXT NOT NULL,
        regra_id TEXT NOT NULL,
        status TEXT NOT NULL,
        executado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projeto_registrado (
        id TEXT PRIMARY KEY,
        caminho TEXT NOT NULL UNIQUE,
        criado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS linha_de_base (
        projeto_id TEXT PRIMARY KEY,
        dados TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS execucao_regra ON execucao (projeto_id, stack, regra_id, id);
    `);
  }

  /** Projetos que o usuário registrou, na ordem em que foram adicionados. */
  registeredList(): { id: string; caminho: string; criadoEm: string }[] {
    const rows = this.db
      .prepare('SELECT id, caminho, criado_em FROM projeto_registrado ORDER BY criado_em, caminho')
      .all() as { id: string; caminho: string; criado_em: string }[];
    return rows.map((r) => ({ id: r.id, caminho: r.caminho, criadoEm: r.criado_em }));
  }

  registerProject(id: string, caminho: string): void {
    this.db
      .prepare('INSERT INTO projeto_registrado (id, caminho, criado_em) VALUES (?, ?, ?)')
      .run(id, caminho, new Date().toISOString());
  }

  /** Linha de base do projeto (última versão vista pelo usuário). Null quando ainda não existe. */
  getBaseline(projetoId: string): LinhaDeBase | null {
    const row = this.db.prepare('SELECT dados FROM linha_de_base WHERE projeto_id = ?').get(projetoId) as
      | { dados: string }
      | undefined;
    return row ? (JSON.parse(row.dados) as LinhaDeBase) : null;
  }

  setBaseline(projetoId: string, base: LinhaDeBase): void {
    this.db
      .prepare('INSERT INTO linha_de_base (projeto_id, dados) VALUES (?, ?) ON CONFLICT(projeto_id) DO UPDATE SET dados = excluded.dados')
      .run(projetoId, JSON.stringify(base));
  }

  /** Remove o registro e o histórico do projeto. Retorna false quando não existia. */
  unregisterProject(id: string): boolean {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM linha_de_base WHERE projeto_id = ?').run(id);
      this.db.prepare('DELETE FROM execucao WHERE projeto_id = ?').run(id);
      this.db.prepare('DELETE FROM sincronizacao_stack WHERE projeto_id = ?').run(id);
      this.db.prepare('DELETE FROM projeto_selecao WHERE projeto_id = ?').run(id);
      return this.db.prepare('DELETE FROM projeto_registrado WHERE id = ?').run(id).changes;
    });
    return tx() > 0;
  }

  /** Retorna a seleção salva; projetos sem registro ficam selecionados por padrão. */
  selectionMap(): Map<string, boolean> {
    const rows = this.db.prepare('SELECT projeto_id, selecionado FROM projeto_selecao').all() as {
      projeto_id: string;
      selecionado: number;
    }[];
    return new Map(rows.map((r) => [r.projeto_id, r.selecionado === 1]));
  }

  setSelection(projetoId: string, selecionado: boolean): void {
    this.db
      .prepare(
        'INSERT INTO projeto_selecao (projeto_id, selecionado) VALUES (?, ?) ON CONFLICT(projeto_id) DO UPDATE SET selecionado = excluded.selecionado'
      )
      .run(projetoId, selecionado ? 1 : 0);
  }

  /**
   * Registra uma nova execução por regra quando a assinatura dos relatórios da stack mudou.
   * Sem mudança, nada é gravado, para o histórico refletir execuções reais e não varreduras.
   */
  recordIfChanged(
    projetoId: string,
    stack: Stack,
    fingerprint: string,
    regras: { regraId: string; status: RuleStatus }[],
    executadoEm: string
  ): boolean {
    if (fingerprint === '') return false;
    const current = this.db
      .prepare('SELECT fingerprint FROM sincronizacao_stack WHERE projeto_id = ? AND stack = ?')
      .get(projetoId, stack) as { fingerprint: string } | undefined;
    if (current?.fingerprint === fingerprint) return false;

    const insert = this.db.prepare(
      'INSERT INTO execucao (projeto_id, stack, regra_id, status, executado_em) VALUES (?, ?, ?, ?, ?)'
    );
    const prune = this.db.prepare(`
      DELETE FROM execucao WHERE projeto_id = ? AND stack = ? AND regra_id = ? AND id NOT IN (
        SELECT id FROM execucao WHERE projeto_id = ? AND stack = ? AND regra_id = ? ORDER BY id DESC LIMIT ?
      )`);
    const tx = this.db.transaction(() => {
      for (const r of regras) {
        insert.run(projetoId, stack, r.regraId, r.status, executadoEm);
        prune.run(projetoId, stack, r.regraId, projetoId, stack, r.regraId, HISTORY_SIZE);
      }
      this.db
        .prepare(
          'INSERT INTO sincronizacao_stack (projeto_id, stack, fingerprint) VALUES (?, ?, ?) ON CONFLICT(projeto_id, stack) DO UPDATE SET fingerprint = excluded.fingerprint'
        )
        .run(projetoId, stack, fingerprint);
    });
    tx();
    return true;
  }

  /** Últimas execuções de uma regra em uma stack, em ordem cronológica (RF-20). */
  history(projetoId: string, stack: Stack, regraId: string): HistoryEntry[] {
    const rows = this.db
      .prepare(
        'SELECT status, executado_em FROM execucao WHERE projeto_id = ? AND stack = ? AND regra_id = ? ORDER BY id DESC LIMIT ?'
      )
      .all(projetoId, stack, regraId, HISTORY_SIZE) as {
      status: RuleStatus;
      executado_em: string;
    }[];
    return rows.map((r) => ({ status: r.status, executadoEm: r.executado_em })).reverse();
  }

  close(): void {
    this.db.close();
  }
}

export function storeFilePath(dataDir: string): string {
  return join(dataDir, 'behavior.db');
}
