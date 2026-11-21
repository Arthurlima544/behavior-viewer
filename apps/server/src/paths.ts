import { promises as fs } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { ApiError } from './errors.js';

/** Caminho real (sem symlinks) de uma pasta. Lança se não existir. */
export async function realDir(path: string): Promise<string> {
  const real = await fs.realpath(path);
  const stat = await fs.stat(real);
  if (!stat.isDirectory()) throw new ApiError(422, 'nao-e-pasta', 'o caminho informado não é uma pasta');
  return real;
}

export function isInside(child: string, root: string): boolean {
  return child === root || child.startsWith(root.endsWith(sep) ? root : root + sep);
}

/**
 * Valida um caminho vindo do cliente: absoluto, existente e dentro de uma raiz permitida.
 * Usa caminho real, então symlinks que saem da raiz são recusados.
 */
export async function resolveAllowed(input: unknown, roots: string[], label = '~'): Promise<string> {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new ApiError(400, 'corpo-invalido', 'informe o caminho da pasta');
  }
  const caminho: string = expandLabel(input.trim(), roots, label);
  if (!isAbsolute(caminho)) {
    throw new ApiError(400, 'caminho-relativo', 'o caminho deve ser absoluto');
  }
  let real: string;
  try {
    real = await realDir(resolve(caminho));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(404, 'pasta-nao-encontrada', 'pasta não encontrada');
  }
  const realRoots = await Promise.all(roots.map((r) => fs.realpath(r).catch(() => r)));
  if (!realRoots.some((r) => isInside(real, r))) {
    throw new ApiError(403, 'fora-das-raizes', 'caminho fora das pastas permitidas para este Behavior Viewer');
  }
  return real;
}

/**
 * Traduz o rótulo exibido ("~/code/x") para o caminho da primeira raiz ("/home/u/code/x"),
 * para que o usuário possa digitar o que vê na tela.
 */
export function expandLabel(input: string, roots: string[], label: string): string {
  const first = roots[0];
  if (!first) return input;
  if (input === label) return first;
  if (input.startsWith(label + '/')) return join(first, input.slice(label.length + 1));
  return input;
}

/** Caminho para exibição: "~/code/marketplace" (a raiz é trocada pelo rótulo). */
export function displayPath(abs: string, roots: string[], label: string): string {
  for (const root of roots) {
    if (isInside(abs, root)) {
      const rel = relative(root, abs).split(sep).join('/');
      return rel ? `${label}/${rel}` : label;
    }
  }
  return abs;
}
