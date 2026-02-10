diff --git a/vite-env.d.ts b/vite-env.d.ts
new file mode 100644
index 0000000..5555555
--- /dev/null
+++ b/vite-env.d.ts
@@ -0,0 +1,22 @@
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  readonly VITE_STRIPE_CLIENT_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
