import type { RegraModel } from '../model.js';
import type { Stack } from '@behavior-viewer/domain';

/** Reconstrói o Gherkin de uma regra em uma stack, para copiar (RF-38). */
export function gherkinOf(regra: RegraModel, stack: Stack): string {
  const impl = regra.implementacoes.find((i) => i.stack === stack);
  const lines: string[] = [];
  if (regra.tags.length > 0)
    lines.push(regra.tags.map((t) => (t.startsWith('@') ? t : `@${t}`)).join(' '));
  lines.push(`# ${regra.funcionalidadeNome} · ${impl?.arquivo ?? ''}`);
  lines.push(`Regra: ${regra.titulo}`);
  if (regra.descricao) {
    for (const d of regra.descricao.split('\n')) lines.push(`  ${d.trim()}`);
  }
  for (const c of impl?.cenarios ?? []) {
    lines.push('');
    lines.push(`  ${c.tipo === 'esquema' ? 'Esquema do Cenário' : 'Cenário'}: ${c.nome}`);
    for (const p of c.passos) lines.push(`    ${p.palavra} ${p.texto}`);
    if (c.exemplos.length > 0) {
      lines.push('');
      lines.push('    Exemplos:');
      for (const row of c.exemplos) lines.push(`      | ${row.join(' | ')} |`);
    }
  }
  return lines.join('\n') + '\n';
}
