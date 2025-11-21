import React, {useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import {supabase} from '../api/api';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({data}) => {
        if (!mounted) return;
        setAuthenticated(Boolean(data.session));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading session..." />
      </Card>
    );
  }

  if (!authenticated) {
    return <Navigate to="/supabase-login" replace />;
  }

  return (
    <div className="overview">
      <Card>
        <h2>Dashboard</h2>
        <p className="muted">Supabase login successful. Build out dashboard content here.</p>
      </Card>
    </div>
  );
};

export default DashboardPage;
