import { createHash } from 'node:crypto';

/** SHA-256 em hexadecimal de um texto. */
export function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** Assinatura de uma pasta de testes: hash da lista ordenada de (arquivo, hash). */
export function assinaturaDe(arquivos: Record<string, string>): string {
  const linhas = Object.keys(arquivos)
    .sort()
    .map((a) => `${a}\u0000${arquivos[a]}\n`);
  return sha256(linhas.join(''));
}

/** Linha de base: como a pasta estava na última vez que o usuário viu o projeto. */
export interface LinhaDeBase {
  arquivos: Record<string, string>;
  contadores: { regras: number; cenarios: number };
  vistoEm: string;
}

export interface AtualizacoesModel {
  pendentes: boolean;
  /** Assinatura atual da pasta (primeiros 12 caracteres, para exibição). */
  assinatura: string;
  novos: string[];
  alterados: string[];
  removidos: string[];
  /** Contagens da linha de base, para mostrar a variação. Null quando não há linha de base. */
  antes: { regras: number; cenarios: number } | null;
  agora: { regras: number; cenarios: number };
  vistoEm: string | null;
}

export function diferencas(antes: Record<string, string>, agora: Record<string, string>) {
  const novos: string[] = [];
  const alterados: string[] = [];
  const removidos: string[] = [];
  for (const arq of Object.keys(agora)) {
    if (!(arq in antes)) novos.push(arq);
    else if (antes[arq] !== agora[arq]) alterados.push(arq);
  }
  for (const arq of Object.keys(antes)) {
    if (!(arq in agora)) removidos.push(arq);
  }
  return { novos: novos.sort(), alterados: alterados.sort(), removidos: removidos.sort() };
}

/** Compara a pasta atual com a linha de base e diz o que mudou. Sem linha de base, nada está pendente. */
export function calcularAtualizacoes(
  atual: { arquivos: Record<string, string>; contadores: { regras: number; cenarios: number } },
  base: LinhaDeBase | null,
): AtualizacoesModel {
  const assinatura = assinaturaDe(atual.arquivos).slice(0, 12);
  if (!base) {
    return {
      pendentes: false,
      assinatura,
      novos: [],
      alterados: [],
      removidos: [],
      antes: null,
      agora: atual.contadores,
      vistoEm: null,
    };
  }
  const d = diferencas(base.arquivos, atual.arquivos);
  const pendentes = d.novos.length + d.alterados.length + d.removidos.length > 0;
  return {
    pendentes,
    assinatura,
    ...d,
    antes: base.contadores,
    agora: atual.contadores,
    vistoEm: base.vistoEm,
  };
}
