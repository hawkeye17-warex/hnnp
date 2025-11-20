import React from 'react';

import Card from '../components/Card';
import {useSession} from '../hooks/useSession';

const ApiDocsPage = () => {
  const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
  const {session} = useSession();

  return (
    <div className="overview">
      <Card>
        <h2>API access</h2>
        <p className="muted">
          You are authenticated as org <strong>{session?.orgId ?? 'unknown'}</strong>. Keep your API
          key secret; it is not shown here.
        </p>
        <p>
          Base URL: <code>{baseUrl ?? 'Not configured (set VITE_BACKEND_BASE_URL)'}</code>
        </p>
      </Card>

      <Card>
        <h3>Examples</h3>
        <div className="code-block">
{`# List receivers
curl -H "x-hnnp-api-key: <api-key>" \\
  "${baseUrl || '<base-url>'}/v2/orgs/<orgId>/receivers"

# List presence events
curl -H "x-hnnp-api-key: <api-key>" \\
  "${baseUrl || '<base-url>'}/v1/presence/events?orgId=<orgId>&limit=50"

# Create a link
curl -X POST -H "Content-Type: application/json" \\
  -H "x-hnnp-api-key: <api-key>" \\
  -d '{"userRef":"user_123","deviceId":"device_abc"}' \\
  "${baseUrl || '<base-url>'}/v1/links"
`}
        </div>
      </Card>
    </div>
  );
};

export default ApiDocsPage;
