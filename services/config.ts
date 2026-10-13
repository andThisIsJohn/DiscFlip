export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
}

interface AppConfig {
  env: Environment;
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublicKey: string;
  stripeClientId: string;
  apiBaseUrl: string;
  isMockEnabled: boolean;
}

const getEnv = (): Environment => {
  const host = window.location.hostname;
  if (host.includes('staging')) return Environment.Staging;
  if (host === 'discflip.io') return Environment.Production;
  return Environment.Development;
};

const env = getEnv();

export const config: AppConfig = {
  env,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  // Supabase now calls this the "publishable" key; older projects call it the "anon" key.
  // Either variable name works.
  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    'your-anon-key',
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_xxx',
  stripeClientId: import.meta.env.VITE_STRIPE_CLIENT_ID || 'ca_xxx',
  // Empty = same origin. On Vercel the /api functions live next to the site; in local dev
  // Vite proxies /api to `vercel dev` (see vite.config.ts).
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, ''),
  // Fallback to mock/localStorage mode if core infrastructure keys are missing
  isMockEnabled: !import.meta.env.VITE_SUPABASE_URL,
};
