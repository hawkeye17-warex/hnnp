import { apiFetch } from '../api/client';

let lastSent = 0;
const THROTTLE_MS = 5000;

export async function logClientError(payload: {level?: 'info' | 'warn' | 'error'; message: string; component?: string; stack?: string; userId?: string}) {
  const now = Date.now();
  if (now - lastSent < THROTTLE_MS) return;
  lastSent = now;
  try {
    await apiFetch('/api/org/client-logs', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        level: payload.level ?? 'error',
        message: payload.message,
        component: payload.component,
        stack: payload.stack,
        user_id: payload.userId,
      }),
      skipAuth: true,
    });
  } catch {
    // ignore client log failures
  }
}
