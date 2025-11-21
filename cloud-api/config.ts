import fs from 'node:fs';
import path from 'node:path';

// Load .env and .env.local once, supporting overrides from .env.local.
let envLoaded = false;
const loadEnvFiles = () => {
  if (envLoaded) return;
  const dotenv = require('dotenv') as typeof import('dotenv');

  // Search cwd first, then this module's directory.
  const baseDirs = [process.cwd(), __dirname];
  const candidates = baseDirs.flatMap(dir => [
    {file: path.join(dir, '.env'), override: false},
    {file: path.join(dir, '.env.local'), override: true},
  ]);

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.file)) continue;
    seen.add(candidate.file);
    if (fs.existsSync(candidate.file)) {
      dotenv.config({path: candidate.file, override: candidate.override});
    }
  }
  envLoaded = true;
};

const requireString = (key: string): string => {
  const val = process.env[key];
  if (!val || typeof val !== 'string' || val.trim() === '') {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val.trim();
};

const requireUrl = (key: string): string => {
  const val = requireString(key);
  try {
    // eslint-disable-next-line no-new
    new URL(val);
  } catch {
    throw new Error(`Invalid URL for ${key}`);
  }
  return val;
};

export type AppConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  cloudApiBaseUrl: string;
  cloudApiAdminSecret: string;
};

export const loadConfig = (): AppConfig => {
  loadEnvFiles();

  const supabaseUrl = requireUrl('SUPABASE_URL');
  const supabaseAnonKey = requireString('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireString('SUPABASE_SERVICE_ROLE_KEY');
  const cloudApiBaseUrl = requireUrl('CLOUD_API_BASE_URL');
  const cloudApiAdminSecret = requireString('CLOUD_API_ADMIN_SECRET');

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    cloudApiBaseUrl,
    cloudApiAdminSecret,
  };
};

