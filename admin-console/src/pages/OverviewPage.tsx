import React from 'react';

import Card from '../components/Card';

const OverviewPage = () => {
  return (
    <div className="card-grid">
      <Card>
        <h2>Overview</h2>
        <p>Snapshot of presence, org status, and recent activity.</p>
      </Card>
      <Card>
        <h2>Presence status</h2>
        <p>Placeholder widget content.</p>
      </Card>
    </div>
  );
};

export default OverviewPage;
