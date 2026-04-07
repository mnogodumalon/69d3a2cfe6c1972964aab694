import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KoerpermessungPage from '@/pages/KoerpermessungPage';
import UebungsverwaltungPage from '@/pages/UebungsverwaltungPage';
import TrainingsprotokollPage from '@/pages/TrainingsprotokollPage';
import FitnesszielePage from '@/pages/FitnesszielePage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="koerpermessung" element={<KoerpermessungPage />} />
              <Route path="uebungsverwaltung" element={<UebungsverwaltungPage />} />
              <Route path="trainingsprotokoll" element={<TrainingsprotokollPage />} />
              <Route path="fitnessziele" element={<FitnesszielePage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
