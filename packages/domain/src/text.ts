/**
 * Normaliza um título para comparação (RF-14): minúsculas, sem acentos,
 * sem pontuação e com espaços colapsados.
 */
export function normalizeTitle(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gera um slug estável para identificadores derivados (ex.: IDs provisórios). */
export function slugify(text: string): string {
  return normalizeTitle(text).replace(/\s/g, '-');
}

/** Hash FNV-1a de 32 bits em hexadecimal, usado para IDs provisórios estáveis. */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}
