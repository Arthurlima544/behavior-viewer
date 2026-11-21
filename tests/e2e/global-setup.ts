import { resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

const BASE = 'http://127.0.0.1:8790';

/**
 * Registra o projeto de exemplo pela API, como o usuário faria pela interface.
 * O Behavior Viewer não tem projetos pré-cadastrados: os testes partem de um estado real.
 */
export default async function globalSetup(_config: FullConfig) {
  const caminho = resolve('tests', 'fixtures', 'marketplace');
  const res = await fetch(`${BASE}/api/v1/projetos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caminho }),
  });
  // 409 = já registrado em uma execução anterior: é o estado esperado.
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`não foi possível registrar o projeto de exemplo: ${res.status} ${await res.text()}`);
  }
}
