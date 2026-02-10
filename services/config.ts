
export enum Environment {
    Development = 'development',
    Staging = 'staging',
    Production = 'production'
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

// Fix: Access environment variables via process.env instead of import.meta.env 
// to fix "Property 'env' does not exist on type 'ImportMeta'" errors.
export const config: AppConfig = {
    env,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key',
    stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_xxx',
    stripeClientId: import.meta.env.VITE_STRIPE_CLIENT_ID || 'ca_xxx',
    apiBaseUrl:
      import.meta.env.VITE_API_BASE_URL ||
      (env === Environment.Production ? 'https://api.discflip.io' : 'http://localhost:3000'),
    // Fallback to mock/localStorage mode if core infrastructure keys are missing
    isMockEnabled: !import.meta.env.VITE_SUPABASE_URL
};
