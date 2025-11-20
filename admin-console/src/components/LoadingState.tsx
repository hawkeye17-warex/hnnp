import React from 'react';

type LoadingStateProps = {
  message?: string;
};

const LoadingState = ({message = 'Loading…'}: LoadingStateProps) => {
  return <div className="state state--loading">{message}</div>;
};

export default LoadingState;
