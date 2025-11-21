import {createClient, SupabaseClient} from '@supabase/supabase-js';

/**
 * Shared Supabase types aligned to cloud-api/db/migrations/001_init_schema.sql
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | {[key: string]: Json | undefined}
  | Json[];

export type Database = {
  public: {
    Tables: {
      devices: {
        Row: {
          device_id: string;
          device_id_base: string;
          first_seen_at: string;
          org_id: string | null;
          registered: boolean;
        };
        Insert: {
          device_id: string;
          device_id_base: string;
          first_seen_at?: string;
          org_id?: string | null;
          registered?: boolean;
        };
        Update: {
          device_id?: string;
          device_id_base?: string;
          first_seen_at?: string;
          org_id?: string | null;
          registered?: boolean;
        };
        Relationships: [];
      };
      device_keys: {
        Row: {
          device_auth_key: string;
          device_id: string;
          org_id: string;
          registration_at: string;
        };
        Insert: {
          device_auth_key: string;
          device_id: string;
          org_id: string;
          registration_at?: string;
        };
        Update: {
          device_auth_key?: string;
          device_id?: string;
          org_id?: string;
          registration_at?: string;
        };
        Relationships: [];
      };
      receivers: {
        Row: {
          created_at: string;
          last_seen_at: string | null;
          org_id: string;
          receiver_id: string;
          receiver_secret: string;
        };
        Insert: {
          created_at?: string;
          last_seen_at?: string | null;
          org_id: string;
          receiver_id: string;
          receiver_secret: string;
        };
        Update: {
          created_at?: string;
          last_seen_at?: string | null;
          org_id?: string;
          receiver_id?: string;
          receiver_secret?: string;
        };
        Relationships: [];
      };
      links: {
        Row: {
          created_at: string;
          device_id: string;
          link_id: string;
          org_id: string;
          revoked_at: string | null;
          user_ref: string;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          link_id: string;
          org_id: string;
          revoked_at?: string | null;
          user_ref: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          link_id?: string;
          org_id?: string;
          revoked_at?: string | null;
          user_ref?: string;
        };
        Relationships: [];
      };
      presence_sessions: {
        Row: {
          device_id: string;
          first_seen_at: string;
          last_seen_at: string;
          org_id: string;
          presence_session_id: string;
          resolved_at: string | null;
        };
        Insert: {
          device_id: string;
          first_seen_at?: string;
          last_seen_at?: string;
          org_id: string;
          presence_session_id: string;
          resolved_at?: string | null;
        };
        Update: {
          device_id?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          org_id?: string;
          presence_session_id?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      presence_events: {
        Row: {
          device_id: string;
          event_id: string;
          link_id: string | null;
          org_id: string;
          presence_session_id: string | null;
          receiver_id: string;
          suspicious_flags: Json | null;
          time_slot: number;
          timestamp: string;
        };
        Insert: {
          device_id: string;
          event_id: string;
          link_id?: string | null;
          org_id: string;
          presence_session_id?: string | null;
          receiver_id: string;
          suspicious_flags?: Json | null;
          time_slot: number;
          timestamp: string;
        };
        Update: {
          device_id?: string;
          event_id?: string;
          link_id?: string | null;
          org_id?: string;
          presence_session_id?: string | null;
          receiver_id?: string;
          suspicious_flags?: Json | null;
          time_slot?: number;
          timestamp?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | {schema: keyof Database},
  TableName extends PublicTableNameOrOptions extends {schema: keyof Database}
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends {schema: keyof Database}
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Row']
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions]['Row']
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | {schema: keyof Database},
  TableName extends PublicTableNameOrOptions extends {schema: keyof Database}
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends {schema: keyof Database}
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Insert']
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions]['Insert']
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | {schema: keyof Database},
  TableName extends PublicTableNameOrOptions extends {schema: keyof Database}
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends {schema: keyof Database}
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Update']
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions]['Update']
  : never;

export type SupabaseBrowserClient = SupabaseClient<Database>;
export type SupabaseServiceRoleClient = SupabaseClient<Database>;

const isServer = typeof window === 'undefined';
let envLoaded = false;

export const loadSupabaseEnv = () => {
  if (envLoaded || !isServer) return;

  // Lazy-load node-only deps so this module can still be imported in the browser.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {config} = require('dotenv') as typeof import('dotenv');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('node:fs') as typeof import('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('node:path') as typeof import('node:path');

  const moduleDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const baseDirs = [process.cwd(), path.resolve(moduleDir, '..')];

  const candidates = baseDirs.flatMap(dir => [
    {path: path.join(dir, '.env'), override: false},
    {path: path.join(dir, '.env.local'), override: true},
  ]);

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.path)) continue;
    seen.add(candidate.path);
    if (fs.existsSync(candidate.path)) {
      config({path: candidate.path, override: candidate.override});
    }
  }

  envLoaded = true;
};

type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

const resolveSupabaseEnv = (): SupabaseEnv => {
  if (isServer) {
    loadSupabaseEnv();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('Missing Supabase URL (set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL).');
  }

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      'Missing Supabase anon key (set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY).',
    );
  }

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  return {url, anonKey, serviceRoleKey};
};

let browserClient: SupabaseBrowserClient | null = null;
export const getBrowserSupabaseClient = (): SupabaseBrowserClient => {
  if (!browserClient) {
    const {url, anonKey} = resolveSupabaseEnv();
    browserClient = createClient<Database>(url, anonKey);
  }
  return browserClient;
};

let serviceRoleClient: SupabaseServiceRoleClient | null = null;
export const getServiceRoleSupabaseClient = (): SupabaseServiceRoleClient => {
  if (!isServer) {
    throw new Error('Service role client must only be used on the server.');
  }
  if (!serviceRoleClient) {
    const {url, serviceRoleKey} = resolveSupabaseEnv();
    if (!serviceRoleKey) {
      throw new Error('Missing Supabase service role key (SUPABASE_SERVICE_ROLE_KEY).');
    }
    serviceRoleClient = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceRoleClient;
};

