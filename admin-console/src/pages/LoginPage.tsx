import React from 'react';
import {Link} from 'react-router-dom';

const LoginPage = () => {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">NearID Admin</div>
        <h1>Sign in</h1>
        <p>Use your org admin credentials to access the console.</p>
        <Link to="/overview" className="primary auth-button">
          Continue to console
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
