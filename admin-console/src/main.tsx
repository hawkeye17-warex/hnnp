import React from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider, Navigate} from 'react-router-dom';

import './styles.css';
import ApiDocsPage from './pages/ApiDocsPage';
import LinksPage from './pages/LinksPage';
import LoginPage from './pages/LoginPage';
import OrgSettingsPage from './pages/OrgSettingsPage';
import OverviewPage from './pages/OverviewPage';
import PresencePage from './pages/PresencePage';
import ReceiversPage from './pages/ReceiversPage';
import DashboardPage from './pages/DashboardPage';
import SupabaseLoginPage from './pages/SupabaseLoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminAccountPage from './pages/AdminAccountPage';
import OrganizationsPage from './pages/OrganizationsPage';
import MainLayout from './layout/MainLayout';
import {ThemeProvider} from './theme/ThemeProvider';
import {AuthProvider, ProtectedRoute} from './context/AuthContext';
import {ToastProvider} from './context/ToastContext';

const ProtectedLayout = ProtectedRoute(MainLayout);

const router = createBrowserRouter([
  {path: '/supabase-login', element: <SupabaseLoginPage />},
  {path: '/forget-password', element: <Navigate to="/forgot-password" replace />},
  {path: '/forgot-password', element: <ForgotPasswordPage />},
  {path: '/reset-password', element: <ResetPasswordPage />},
  {path: '/dashboard', element: <DashboardPage />},
  {path: '/login', element: <LoginPage />},
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {path: 'overview', element: <OverviewPage />},
      {path: 'receivers', element: <ReceiversPage />},
      {path: 'presence', element: <PresencePage />},
      {path: 'links', element: <LinksPage />},
      {path: 'org-settings', element: <OrgSettingsPage />},
      {path: 'api', element: <ApiDocsPage />},
      {path: 'account', element: <AdminAccountPage />},
      {path: 'organizations', element: <OrganizationsPage />},
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
