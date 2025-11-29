import React from 'react';
import {useNavigate} from 'react-router-dom';

type ErrorBoundaryState = {hasError: boolean};

export class ErrorBoundary extends React.Component<React.PropsWithChildren<unknown>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Error boundary caught:', error, errorInfo);
    void fetch('/api/logs/client', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: error.message, stack: error.stack, info: errorInfo.componentStack}),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return <Fallback />;
    }
    return this.props.children;
  }
}

const Fallback = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-600">
          We hit an unexpected error. Please try again or go back to Overview.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/overview')}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">
            Go back to Overview
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 text-sm">
            Reload
          </button>
        </div>
      </div>
    </div>
  );
};
