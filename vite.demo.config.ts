import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Offline demo build: no Supabase, Stripe or other keys, so the app runs in its
// localStorage demo mode. `npm run build:demo` turns it into one self-contained HTML file.
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '""',
    'import.meta.env.VITE_SENTRY_DSN': '""',
  },
  build: {
    outDir: 'dist-demo',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
