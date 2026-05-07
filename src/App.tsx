import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import RevenuePage from './pages/RevenuePage';
import ExpensePage from './pages/ExpensePage';
import ClientPage from './pages/ClientPage';
import ProjectPage from './pages/ProjectPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/revenues" element={<RevenuePage />} />
        <Route path="/expenses" element={<ExpensePage />} />
        <Route path="/clients" element={<ClientPage />} />
        <Route path="/projects" element={<ProjectPage />} />
        <Route path="/reports" element={<ReportPage />} />
      </Route>
    </Routes>
  );
}
