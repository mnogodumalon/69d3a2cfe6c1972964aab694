import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import UebungsverwaltungPage from '@/pages/UebungsverwaltungPage';
import FitnesszielePage from '@/pages/FitnesszielePage';
import KoerpermessungPage from '@/pages/KoerpermessungPage';
import TrainingsprotokollPage from '@/pages/TrainingsprotokollPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="uebungsverwaltung" element={<UebungsverwaltungPage />} />
              <Route path="fitnessziele" element={<FitnesszielePage />} />
              <Route path="koerpermessung" element={<KoerpermessungPage />} />
              <Route path="trainingsprotokoll" element={<TrainingsprotokollPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
