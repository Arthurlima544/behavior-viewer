import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Referência atual do repositório ("main · a3f9c1e") lida de .git, sem executar git (RF-21). */
export async function readGitRef(projectRoot: string): Promise<string | null> {
  const gitDir = join(projectRoot, '.git');
  let head: string;
  try {
    head = (await fs.readFile(join(gitDir, 'HEAD'), 'utf8')).trim();
  } catch {
    return null;
  }
  const match = /^ref: refs\/heads\/(.+)$/.exec(head);
  if (!match) return head.slice(0, 7);
  const branch = match[1] as string;
  let commit: string | null = null;
  try {
    commit = (await fs.readFile(join(gitDir, 'refs', 'heads', branch), 'utf8')).trim();
  } catch {
    commit = null;
  }
  return commit ? `${branch} · ${commit.slice(0, 7)}` : branch;
}

/** Último commit que tocou um arquivo: "a3f9c1e|2026-11-19T10:00:00-03:00". Null sem git. */
export async function lastCommitOf(
  projectRoot: string,
  fileRel: string
): Promise<{ commit: string; data: string } | null> {
  try {
    const { stdout } = await run(
      'git',
      ['-C', projectRoot, 'log', '-1', '--format=%h%x09%cI', '--', fileRel],
      { timeout: 3000 }
    );
    const [commit, data] = stdout.trim().split('\t');
    if (!commit || !data) return null;
    return { commit, data };
  } catch {
    return null;
  }
}
