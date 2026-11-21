import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

/** Sincronização manual: reconstrói os projetos e recarrega os dados da tela. */
export function useSincronizar() {
  const queryClient = useQueryClient();
  const [sincronizando, setSincronizando] = useState(false);

  async function sincronizar() {
    setSincronizando(true);
    try {
      await api.varrer();
      await queryClient.invalidateQueries();
    } finally {
      setSincronizando(false);
    }
  }

  return { sincronizar, sincronizando };
}
