import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';

export function NotFoundPage() {
  return (
    <EmptyState title="Página não encontrada.">
      <Link to="/">Voltar para a visão geral</Link>
    </EmptyState>
  );
}
