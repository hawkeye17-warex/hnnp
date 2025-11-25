import React, {Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider, Navigate} from 'react-router-dom';

import './styles.css';
import LoadingState from './components/LoadingState';
import MainLayout from './layout/MainLayout';
import {ThemeProvider} from './theme/ThemeProvider';
import {AuthProvider, ProtectedRoute} from './context/AuthContext';
import {ToastProvider} from './context/ToastContext';

const OverviewPage = React.lazy(() => import('./pages/OverviewPage'));
const ReceiversPage = React.lazy(() => import('./pages/ReceiversPage'));
const ReceiverDetailsPage = React.lazy(() => import('./pages/ReceiverDetailsPage'));
const PresencePage = React.lazy(() => import('./pages/PresencePage'));
const LinksPage = React.lazy(() => import('./pages/LinksPage'));
const OrgSettingsPage = React.lazy(() => import('./pages/OrgSettingsPage'));
const ApiDocsPage = React.lazy(() => import('./pages/ApiDocsPage'));
const AdminAccountPage = React.lazy(() => import('./pages/AdminAccountPage'));
const OrganizationsPage = React.lazy(() => import('./pages/OrganizationsPage'));
const OrganizationDetailsPage = React.lazy(() => import('./pages/OrganizationDetailsPage'));
const HealthPage = React.lazy(() => import('./pages/HealthPage'));
const ErrorLogsPage = React.lazy(() => import('./pages/ErrorLogsPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const SupabaseLoginPage = React.lazy(() => import('./pages/SupabaseLoginPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const OnboardOrgPage = React.lazy(() => import('./pages/OnboardOrgPage'));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage'));
const AuditLogsPage = React.lazy(() => import('./pages/AuditLogsPage'));
const SystemSettingsPage = React.lazy(() => import('./pages/SystemSettingsPage'));
const GlobalSearchPage = React.lazy(() => import('./pages/GlobalSearchPage'));
const QuizBuilderPage = React.lazy(() => import('./pages/QuizBuilderPage'));
const QuizDetailPage = React.lazy(() => import('./pages/QuizDetailPage'));
const ShiftDetailPage = React.lazy(() => import('./pages/ShiftDetailPage'));

const ProtectedLayout = ProtectedRoute(MainLayout);

const withLoader = (element: React.ReactNode) => (
  <Suspense
    fallback={
      <div className="overview">
        <LoadingState message="Loading..." />
      </div>
    }>
    {element}
  </Suspense>
);

// Support static hosting without SPA rewrites: if redirected with ?redirect=, restore path before router mounts.
const url = new URL(window.location.href);
const redirect = url.searchParams.get('redirect');
if (redirect) {
  window.history.replaceState({}, '', redirect);
}

const basename = import.meta.env.BASE_URL || '/';

const router = createBrowserRouter([
  {path: '/supabase-login', element: withLoader(<SupabaseLoginPage />)},
  {path: '/forget-password', element: <Navigate to="/forgot-password" replace />},
  {path: '/forgot-password', element: withLoader(<ForgotPasswordPage />)},
  {path: '/reset-password', element: withLoader(<ResetPasswordPage />)},
  {path: '/admin/onboard-org', element: withLoader(<OnboardOrgPage />)},
  {path: '/login', element: withLoader(<LoginPage />)},
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {path: 'dashboard', element: withLoader(<DashboardPage />)},
      {path: 'overview', element: withLoader(<OverviewPage />)},
      {path: 'receivers', element: withLoader(<ReceiversPage />)},
      {path: 'receivers/:id', element: withLoader(<ReceiverDetailsPage />)},
      {path: 'presence', element: withLoader(<PresencePage />)},
      {path: 'links', element: withLoader(<LinksPage />)},
      {path: 'org-settings', element: withLoader(<OrgSettingsPage />)},
      {path: 'search', element: withLoader(<GlobalSearchPage />)},
      {path: 'system-settings', element: withLoader(<SystemSettingsPage />)},
      {path: 'health', element: withLoader(<HealthPage />)},
      {path: 'error-logs', element: withLoader(<ErrorLogsPage />)},
      {path: 'api', element: withLoader(<ApiDocsPage />)},
      {path: 'account', element: withLoader(<AdminAccountPage />)},
      {path: 'organizations', element: withLoader(<OrganizationsPage />)},
      {path: 'organizations/:id', element: withLoader(<OrganizationDetailsPage />)},
      {path: 'organizations/:id/quizzes/new', element: withLoader(<QuizBuilderPage />)},
      {path: 'organizations/:id/quizzes/:quizId', element: withLoader(<QuizDetailPage />)},
      {path: 'organizations/:id/shifts/:shiftId', element: withLoader(<ShiftDetailPage />)},
      {path: 'admin-users', element: withLoader(<AdminUsersPage />)},
      {path: 'audit-logs', element: withLoader(<AuditLogsPage />)},
      {path: '*', element: <Navigate to="/overview" replace />},
    ],
  },
  {path: '*', element: <Navigate to="/overview" replace />},
], {basename});

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
