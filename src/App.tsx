import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HeatMap = lazy(() => import('./pages/HeatMap'));
const Hotspots = lazy(() => import('./pages/Hotspots'));
const Canopy = lazy(() => import('./pages/Canopy'));
const Mitigation = lazy(() => import('./pages/Mitigation'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
    return (
        <div className="flex h-screen items-center justify-center text-sm text-[#888]">
            Loading…
        </div>
    );
}

export default function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/heatmap" element={<HeatMap />} />
                    <Route path="/hotspots" element={<Hotspots />} />
                    <Route path="/canopy" element={<Canopy />} />
                    <Route path="/mitigation" element={<Mitigation />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}
