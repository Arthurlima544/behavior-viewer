import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { OverviewPage } from '../pages/OverviewPage';
import { CatalogPage } from '../pages/CatalogPage';
import { RuleDetailPage } from '../pages/RuleDetailPage';
import { PresentationPage } from '../pages/PresentationPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      {/* Apresentação é tela cheia, sem a sidebar (docs/design §1.4). */}
      <Route path="projetos/:projetoId/apresentar/:funcionalidade" element={<PresentationPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="projetos/:projetoId" element={<CatalogPage />} />
        <Route path="projetos/:projetoId/regras/:regraId" element={<RuleDetailPage />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
