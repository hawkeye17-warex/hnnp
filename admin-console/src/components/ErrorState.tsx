import React from 'react';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

const ErrorState = ({message, onRetry}: ErrorStateProps) => {
  return (
    <div className="state state--error">
      <div>{message}</div>
      {onRetry ? (
        <button className="secondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
};

export default ErrorState;
