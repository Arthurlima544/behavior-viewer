import { useState } from 'react';
import { ChevronRight, CornerLeftUp, Folder, FolderCheck } from 'lucide-react';
import { usePastas } from '../api/queries';
import { ApiError } from '../api/client';
import { Button } from './Button';
import styles from './FolderBrowser.module.css';

interface Props {
  onUse: (caminho: string) => void;
  busy?: boolean;
}

/**
 * Navegador de pastas dentro das raízes permitidas pelo servidor. O navegador não acessa o disco:
 * cada listagem vem do Behavior Viewer, que só mostra o que está dentro das raízes autorizadas.
 */
export function FolderBrowser({ onUse, busy }: Props) {
  const [atual, setAtual] = useState<string | undefined>(undefined);
  const [digitado, setDigitado] = useState('');
  const pastas = usePastas(atual);
  const data = pastas.data;
  const erro = pastas.error as Error | null;

  function abrir(caminho: string) {
    setAtual(caminho);
    setDigitado('');
  }

  return (
    <section className={styles.box} aria-label="Escolher pasta">
      <form
        className={styles.typed}
        onSubmit={(e) => {
          e.preventDefault();
          if (digitado.trim()) abrir(digitado.trim());
        }}
      >
        <label className={styles.label}>
          <span className={styles.labelText}>Digite o caminho da pasta</span>
          <input
            className={styles.input}
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            placeholder="~/code/meu-projeto"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <Button type="submit" variant="outline" disabled={!digitado.trim()}>
          Abrir
        </Button>
      </form>

      <div className={styles.nav}>
        <Button
          variant="ghost"
          disabled={!data?.caminho}
          icon={<CornerLeftUp size={14} strokeWidth={1.5} />}
          onClick={() => setAtual(data?.pai ?? undefined)}
        >
          Subir
        </Button>
        <span className={`mono ${styles.path}`} aria-live="polite">
          {data?.exibicao ?? 'Pastas disponíveis'}
        </span>
        {data?.caminho ? (
          <Button
            variant="primary"
            disabled={busy}
            icon={<FolderCheck size={16} strokeWidth={1.5} />}
            onClick={() => onUse(data.caminho as string)}
          >
            Procurar projetos aqui
          </Button>
        ) : null}
      </div>

      {erro ? (
        <p className={styles.error} role="alert">
          {erro instanceof ApiError ? erro.message : 'Não foi possível abrir esta pasta.'}
        </p>
      ) : null}

      {pastas.isLoading ? <p className={styles.hint}>Carregando pastas…</p> : null}

      {data && data.itens.length === 0 ? (
        <p className={styles.hint}>Nenhuma subpasta aqui.</p>
      ) : null}

      <ul className={styles.list} aria-label="Pastas">
        {data?.itens.map((item) => (
          <li key={item.caminho}>
            <button type="button" className={styles.item} onClick={() => abrir(item.caminho)}>
              <Folder size={16} strokeWidth={1.5} aria-hidden="true" />
              <span className={styles.name}>{item.nome}</span>
              {item.ehProjeto ? <span className={styles.badge}>projeto</span> : null}
              <ChevronRight size={14} strokeWidth={1.5} className={styles.chev} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
