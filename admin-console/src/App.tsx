import React from 'react';

const App = () => {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="pill">NearID Admin Console</div>
        <h1>Manage presence, orgs, and devices</h1>
        <p>
          Web dashboard for NearID organization administrators. Use this console to monitor presence
          events, manage org settings, and review device health.
        </p>
      </header>

      <section className="card-grid">
        <div className="card">
          <h2>Presence</h2>
          <p>See active sessions, recent check-ins, and broadcast health.</p>
          <button className="primary">View presence</button>
        </div>
        <div className="card">
          <h2>History</h2>
          <p>Search and filter presence events for compliance and auditing.</p>
          <button className="secondary">Open history</button>
        </div>
        <div className="card">
          <h2>Settings</h2>
          <p>Configure org policies, notifications, and security controls.</p>
          <button className="secondary">Go to settings</button>
        </div>
      </section>
    </div>
  );
};

export default App;
