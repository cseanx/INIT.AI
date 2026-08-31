import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import DashboardLayout from './components/layout/DashboardLayout';
import RequireAuth from './auth/RequireAuth';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmailChange = lazy(() => import('./pages/VerifyEmailChange'));

function PageLoader() {
    return (
        <div className="flex h-screen items-center justify-center text-sm text-[#888]">
            Loading…
        </div>
    );
}

function ProtectedLayout() {
    return (
        <RequireAuth>
            <DashboardLayout />
        </RequireAuth>
    );
}

export default function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/verify-email-change" element={<VerifyEmailChange />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<ProtectedLayout />} />
                <Route path="/heatmap" element={<ProtectedLayout />} />
                <Route path="/hotspots" element={<ProtectedLayout />} />
                <Route path="/canopy" element={<ProtectedLayout />} />
                <Route path="/mitigation" element={<ProtectedLayout />} />
                <Route path="/reports" element={<ProtectedLayout />} />
                <Route path="/reports/new" element={<ProtectedLayout />} />
                <Route path="/report/edit" element={<ProtectedLayout />} />
                <Route path="/settings" element={<ProtectedLayout />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <SpeedInsights />
        </Suspense>
    );
}
