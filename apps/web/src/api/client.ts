export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    ...init,
  });
  if (!res.ok) {
    let codigo = 'erro';
    let mensagem = `falha na requisição (${res.status})`;
    try {
      const body = (await res.json()) as { erro?: { codigo: string; mensagem: string } };
      if (body.erro) {
        codigo = body.erro.codigo;
        mensagem = body.erro.mensagem;
      }
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(res.status, codigo, mensagem);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<import('./types').Health>('/health'),
  visaoGeral: () => request<import('./types').VisaoGeral>('/visao-geral'),
  projetos: () => request<{ items: import('./types').ProjectSummary[] }>('/projetos'),
  setSelecao: (id: string, selecionado: boolean) =>
    request(`/projetos/${encodeURIComponent(id)}/selecao`, {
      method: 'PUT',
      body: JSON.stringify({ selecionado }),
    }),
  funcionalidades: (id: string) =>
    request<{ items: import('./types').Feature[] }>(`/projetos/${encodeURIComponent(id)}/funcionalidades`),
  regras: (id: string, query: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    const qs = params.toString();
    return request<{ total: number; items: import('./types').RuleSummary[] }>(
      `/projetos/${encodeURIComponent(id)}/regras${qs ? `?${qs}` : ''}`,
    );
  },
  matriz: (id: string) => request<import('./types').Matrix>(`/projetos/${encodeURIComponent(id)}/matriz`),
  divergencias: (id: string) =>
    request<{ total: number; items: import('./types').Divergence[] }>(
      `/projetos/${encodeURIComponent(id)}/divergencias`,
    ),
  regra: (id: string, projeto: string) =>
    request<import('./types').RuleDetail>(`/regras/${encodeURIComponent(id)}?projeto=${encodeURIComponent(projeto)}`),
  gherkin: async (id: string, projeto: string, stack: string) => {
    const res = await fetch(
      `/api/v1/regras/${encodeURIComponent(id)}/gherkin?projeto=${encodeURIComponent(projeto)}&stack=${encodeURIComponent(stack)}`,
    );
    if (!res.ok) throw new ApiError(res.status, 'gherkin', 'não foi possível obter o Gherkin');
    return res.text();
  },
  busca: (q: string) => request<{ total: number; items: import('./types').SearchItem[] }>(`/busca?q=${encodeURIComponent(q)}`),
  varrer: () => request<{ status: string }>('/varreduras', { method: 'POST' }),
  pastas: (caminho?: string) =>
    request<import('./types').Pastas>(`/sistema/pastas${caminho ? `?caminho=${encodeURIComponent(caminho)}` : ''}`),
  descobrir: (caminho: string) =>
    request<import('./types').Descoberta>('/descobertas', {
      method: 'POST',
      body: JSON.stringify({ caminho }),
    }),
  registrarProjeto: (caminho: string) =>
    request<import('./types').ProjectSummary>('/projetos', {
      method: 'POST',
      body: JSON.stringify({ caminho }),
    }),
  removerProjeto: (id: string) => request<void>(`/projetos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  estrutura: (id: string) =>
    request<import('./types').ProjetoEstrutura>(`/projetos/${encodeURIComponent(id)}/estrutura`),
};
