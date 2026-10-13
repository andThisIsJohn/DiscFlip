import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Called when a seller comes back from Stripe onboarding (/?stripe=success).
 * Checks their Stripe Express account and records whether payouts are ready.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sign in first.' });

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();
    if (!profile?.stripe_account_id) return res.status(200).json({ complete: false });

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const complete = Boolean(account.charges_enabled && account.payouts_enabled);
    await supabase.from('users').update({ stripe_onboarding_complete: complete }).eq('id', user.id);
    return res.status(200).json({ complete });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
