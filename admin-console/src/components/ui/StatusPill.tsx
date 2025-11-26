import React from 'react';
import clsx from 'clsx';

type Status = 'online' | 'offline' | 'warning';

type StatusPillProps = {
  status: Status;
};

const copy: Record<Status, string> = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Warning',
};

const StatusPill: React.FC<StatusPillProps> = ({status}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
        status === 'online' && 'bg-green-100 text-green-700',
        status === 'offline' && 'bg-red-100 text-red-700',
        status === 'warning' && 'bg-amber-100 text-amber-700',
      )}>
      {copy[status]}
    </span>
  );
};

export default StatusPill;
