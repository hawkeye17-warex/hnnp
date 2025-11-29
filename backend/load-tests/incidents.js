import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://hnnp.onrender.com';
const ORG_ID = __ENV.ORG_ID || '';
const API_KEY = __ENV.API_KEY || '';

export default function () {
  const res = http.get(`${BASE_URL}/v2/orgs/${ORG_ID}/incidents?limit=50`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'x-org-id': ORG_ID,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
