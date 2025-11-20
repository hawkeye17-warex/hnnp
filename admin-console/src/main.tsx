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
import {useSession} from './hooks/useSession';
import {Navigate} from 'react-router-dom';

const ProtectedLayout = () => {
  const {session} = useSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
};

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
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
