import React from 'react';
import {useAuth} from '../context/AuthContext';
import {can} from './permissions';

type Props = {
  permission?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

const RequirePermission: React.FC<Props> = ({permission, children, fallback}) => {
  const {currentUser} = useAuth();
  if (!permission || can(currentUser, permission)) {
    return <>{children}</>;
  }
  return <>{fallback ?? <div className="text-sm text-slate-500">Not authorized.</div>}</>;
};

export default RequirePermission;
