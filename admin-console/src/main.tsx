import React from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';

import './styles.css';
import ApiDocsPage from './pages/ApiDocsPage';
import LinksPage from './pages/LinksPage';
import LoginPage from './pages/LoginPage';
import OrgSettingsPage from './pages/OrgSettingsPage';
import OverviewPage from './pages/OverviewPage';
import PresencePage from './pages/PresencePage';
import ReceiversPage from './pages/ReceiversPage';
import AdminLayout from './layout/AdminLayout';
import {ThemeProvider} from './theme/ThemeProvider';
import {AuthProvider, ProtectedRoute} from './context/AuthContext';
import {ToastProvider} from './context/ToastContext';

const ProtectedLayout = ProtectedRoute(AdminLayout);

const router = createBrowserRouter([
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
