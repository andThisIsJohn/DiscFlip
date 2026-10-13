import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

/** Server-side Supabase client (service role: bypasses row level security). */
export const supabaseAdmin: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** The signed-in user who made this request (from the `Authorization: Bearer <token>` header). */
export async function getRequestUser(req: any): Promise<User | null> {
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

export async function isSystemAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_system_admin')
    .eq('id', userId)
    .maybeSingle();
  return Boolean(data?.is_system_admin);
}
