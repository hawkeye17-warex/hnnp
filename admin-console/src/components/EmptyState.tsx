import React from 'react';

type EmptyStateProps = {
  message: string;
};

const EmptyState = ({message}: EmptyStateProps) => (
  <div className="state state--empty">{message}</div>
);

export default EmptyState;
