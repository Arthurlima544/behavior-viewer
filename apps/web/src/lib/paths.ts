/** Rotas da aplicação (RF-48). */
export const rotas = {
  visaoGeral: () => '/',
  catalogo: (projeto: string, query?: Record<string, string | undefined>) => {
    const qs = query ? montaQuery(query) : '';
    return `/projetos/${encodeURIComponent(projeto)}${qs}`;
  },
  regra: (projeto: string, regra: string) =>
    `/projetos/${encodeURIComponent(projeto)}/regras/${encodeURIComponent(regra)}`,
  apresentacao: (projeto: string, funcionalidade: string, regra?: string) => {
    const qs = regra ? montaQuery({ regra }) : '';
    return `/projetos/${encodeURIComponent(projeto)}/apresentar/${encodeURIComponent(funcionalidade)}${qs}`;
  },
};

function montaQuery(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : '';
}
