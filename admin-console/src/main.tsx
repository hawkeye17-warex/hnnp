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
const LivePresencePage = React.lazy(() => import('./pages/LivePresencePage'));
const IncidentsPage = React.lazy(() => import('./pages/IncidentsPage'));
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const GroupsPage = React.lazy(() => import('./pages/GroupsPage'));
const LocationsPage = React.lazy(() => import('./pages/LocationsPage'));
const LogsPage = React.lazy(() => import('./pages/LogsPage'));
const HpsSecurityPage = React.lazy(() => import('./pages/HpsSecurityPage'));
const IntegrationsPage = React.lazy(() => import('./pages/IntegrationsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const OrgProfilePage = React.lazy(() => import('./pages/OrgProfilePage'));
const SessionsPage = React.lazy(() => import('./pages/SessionsPage'));
const QuizzesPage = React.lazy(() => import('./pages/QuizzesPage'));
const ExamsPage = React.lazy(() => import('./pages/ExamsPage'));
const ShiftsPage = React.lazy(() => import('./pages/ShiftsPage'));
const WorkzonesPage = React.lazy(() => import('./pages/WorkzonesPage'));
const SafetyPage = React.lazy(() => import('./pages/SafetyPage'));
const AccessPage = React.lazy(() => import('./pages/AccessPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const DeveloperApiPage = React.lazy(() => import('./pages/DeveloperApiPage'));
const AuditTrailPage = React.lazy(() => import('./pages/AuditTrailPage'));
const SecuritySettingsPage = React.lazy(() => import('./pages/SecuritySettingsPage'));
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
    {path: '/admin/onboard-org', element: withLoader(<OnboardOrgPage />)},
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
        {path: '/live', element: withLoader(<LivePresencePage />)},
        {path: '/incidents', element: withLoader(<IncidentsPage />)},
        {path: '/attendance', element: withLoader(<AttendancePage />)},
        {path: '/users', element: withLoader(<UsersPage />)},
        {path: '/groups', element: withLoader(<GroupsPage />)},
        {path: '/locations', element: withLoader(<LocationsPage />)},
        {path: '/receivers', element: withLoader(<ReceiversPage />)},
        {path: '/logs', element: withLoader(<LogsPage />)},
        {path: '/hps', element: withLoader(<HpsSecurityPage />)},
        {path: '/integrations', element: withLoader(<IntegrationsPage />)},
        {path: '/settings', element: withLoader(<SettingsPage />)},
        {path: '/org-profile', element: withLoader(<OrgProfilePage />)},
        {path: '/sessions', element: withLoader(<SessionsPage />)},
        {path: '/quizzes', element: withLoader(<QuizzesPage />)},
        {path: '/exams', element: withLoader(<ExamsPage />)},
        {path: '/shifts', element: withLoader(<ShiftsPage />)},
        {path: '/workzones', element: withLoader(<WorkzonesPage />)},
        {path: '/safety', element: withLoader(<SafetyPage />)},
        {path: '/access', element: withLoader(<AccessPage />)},
        {path: '/analytics', element: withLoader(<AnalyticsPage />)},
        {path: '/developer-api', element: withLoader(<DeveloperApiPage />)},
        {path: '/settings/security', element: withLoader(<SecuritySettingsPage />)},
        {path: '/audit-trail', element: withLoader(<AuditTrailPage />)},
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

