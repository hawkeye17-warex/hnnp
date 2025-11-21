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
import MainLayout from './layout/MainLayout';
import {ThemeProvider} from './theme/ThemeProvider';
import {AuthProvider, requireAuth} from './context/AuthContext';

const ProtectedLayout = requireAuth(MainLayout);

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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
