import React, {useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import {supabase} from '../api/api';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setError(null);
      try {
        const {data, error: sessionError} = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!mounted) return;
        setAuthenticated(Boolean(data.session));
        if (data.session) {
          const {data: userData, error: userError} = await supabase.auth.getUser();
          if (userError) throw userError;
          const role =
            (userData.user?.user_metadata as any)?.role ??
            (userData.user?.app_metadata as any)?.role ??
            '';
          if (role !== 'admin') {
            await supabase.auth.signOut();
            setAuthenticated(false);
            throw new Error('Access denied: admin role required.');
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load session.');
        setAuthenticated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    check();
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

  if (error) {
    return (
      <Card>
        <p className="form__error" style={{margin: 0}}>
          {error}
        </p>
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
