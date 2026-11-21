import { promises as fs } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Converte um glob simples (`*`, `**`, `?`) em expressão regular sobre caminhos com `/`. */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] as string;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export function hasWildcard(pattern: string): boolean {
  return /[*?]/.test(pattern);
}

/** Lista arquivos sob `dir` (recursivo, sem seguir symlinks) cujo caminho relativo casa com `pattern`. */
export async function expandPattern(
  baseDir: string,
  pattern: string,
  maxDepth = 8
): Promise<string[]> {
  const normalized = pattern.split(sep).join('/');
  if (!hasWildcard(normalized)) {
    const full = join(baseDir, normalized);
    try {
      const stat = await fs.stat(full);
      return stat.isFile() ? [full] : [];
    } catch {
      return [];
    }
  }

  const regex = globToRegExp(normalized);
  const results: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (entry.isFile()) {
        const rel = relative(baseDir, full).split(sep).join('/');
        if (regex.test(rel)) results.push(full);
      }
    }
  }

  await walk(baseDir, 0);
  return results.sort();
}
