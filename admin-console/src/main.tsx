import React from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';

import './styles.css';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import ReceiversPage from './pages/ReceiversPage';
import PresencePage from './pages/PresencePage';
import LinksPage from './pages/LinksPage';
import OrgSettingsPage from './pages/OrgSettingsPage';
import ApiDocsPage from './pages/ApiDocsPage';
import MainLayout from './layout/MainLayout';

const router = createBrowserRouter([
  {path: '/login', element: <LoginPage />},
  {
    path: '/',
    element: <MainLayout />,
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
    <RouterProvider router={router} />
  </React.StrictMode>,
);
