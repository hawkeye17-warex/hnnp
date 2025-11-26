import React, {Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider, Navigate} from 'react-router-dom';

import './tailwind.css';
import './styles.css';
import LoadingState from './components/LoadingState';
import AppLayout from './layout/AppLayout';
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

const ProtectedLayout = ProtectedRoute(AppLayout);

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

const router = createBrowserRouter(
  [
    {path: '/login', element: withLoader(<LoginPage />)},
    {path: '/forgot-password', element: withLoader(<ForgotPasswordPage />)},
    {path: '/reset-password', element: withLoader(<ResetPasswordPage />)},
    {
      path: '/',
      element: (
        <ProtectedLayout>
          <></>
        </ProtectedLayout>
      ),
      children: [
        {path: '/', element: <Navigate to="/overview" replace />},
        {path: '/overview', element: withLoader(<OverviewPage />)},
        {path: '/live', element: withLoader(<HealthPage />)},
        {path: '/incidents', element: withLoader(<ErrorLogsPage />)},
        {path: '/attendance', element: withLoader(<PresencePage />)},
        {path: '/users', element: withLoader(<OrganizationsPage />)},
        {path: '/groups', element: withLoader(<GlobalSearchPage />)},
        {path: '/locations', element: withLoader(<OrganizationsPage />)},
        {path: '/receivers', element: withLoader(<ReceiversPage />)},
        {path: '/logs', element: withLoader(<AuditLogsPage />)},
        {path: '/hps', element: withLoader(<HealthPage />)},
        {path: '/integrations', element: withLoader(<LinksPage />)},
        {path: '/settings', element: withLoader(<SystemSettingsPage />)},
      ],
    },
    {path: '*', element: <Navigate to="/overview" replace />},
  ],
  {basename},
);

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
