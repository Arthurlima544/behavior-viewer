import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from './client';

export const keys = {
  health: ['health'] as const,
  visao: ['visao-geral'] as const,
  projetos: ['projetos'] as const,
  funcionalidades: (id: string) => ['funcionalidades', id] as const,
  regras: (id: string, q: Record<string, string | undefined>) => ['regras', id, q] as const,
  matriz: (id: string) => ['matriz', id] as const,
  divergencias: (id: string) => ['divergencias', id] as const,
  regra: (id: string, projeto: string) => ['regra', id, projeto] as const,
  busca: (q: string) => ['busca', q] as const,
  pastas: (caminho: string | undefined) => ['pastas', caminho ?? ''] as const,
  estrutura: (id: string) => ['estrutura', id] as const,
};

export const useHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: api.health, refetchInterval: 15_000 });

export const useVisaoGeral = () => useQuery({ queryKey: keys.visao, queryFn: api.visaoGeral });

export const useProjetos = () =>
  useQuery({ queryKey: keys.projetos, queryFn: api.projetos, select: (d) => d.items });

export const useFuncionalidades = (id: string) =>
  useQuery({
    queryKey: keys.funcionalidades(id),
    queryFn: () => api.funcionalidades(id),
    select: (d) => d.items,
    enabled: !!id,
  });

export const useRegras = (id: string, q: Record<string, string | undefined>) =>
  useQuery({
    queryKey: keys.regras(id, q),
    queryFn: () => api.regras(id, q),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

export const useMatriz = (id: string) =>
  useQuery({ queryKey: keys.matriz(id), queryFn: () => api.matriz(id), enabled: !!id });

export const useDivergencias = (id: string) =>
  useQuery({ queryKey: keys.divergencias(id), queryFn: () => api.divergencias(id), enabled: !!id });

export const useRegra = (id: string, projeto: string) =>
  useQuery({ queryKey: keys.regra(id, projeto), queryFn: () => api.regra(id, projeto), enabled: !!id && !!projeto });

export const useBusca = (q: string) =>
  useQuery({
    queryKey: keys.busca(q),
    queryFn: () => api.busca(q),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
  });

export const usePastas = (caminho: string | undefined) =>
  useQuery({ queryKey: keys.pastas(caminho), queryFn: () => api.pastas(caminho), placeholderData: keepPreviousData });

export const useEstrutura = (id: string) =>
  useQuery({ queryKey: keys.estrutura(id), queryFn: () => api.estrutura(id), enabled: !!id });
