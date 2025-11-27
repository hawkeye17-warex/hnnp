import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import CPLayout from "./components/layout/CPLayout";
import OverviewPage from "./pages/OverviewPage";
import OrgListPage from "./pages/OrgListPage";
import OrgDetailPage from "./pages/OrgDetailPage";
import PlaceholderPage from "./pages/PlaceholderPage";

const App: React.FC = () => {
  return (
    <CPLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/orgs" element={<OrgListPage />} />
        <Route path="/orgs/:orgId" element={<OrgDetailPage />} />
        <Route path="/policies" element={<PlaceholderPage title="Policies" />} />
        <Route path="/loa" element={<PlaceholderPage title="LoA Profiles" />} />
        <Route path="/logs" element={<PlaceholderPage title="Logs" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </CPLayout>
  );
};

export default App;
