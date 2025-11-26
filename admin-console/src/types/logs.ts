export type LogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
};
