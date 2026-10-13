import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // High-privilege key for updating user records
);

const getAppBaseUrl = (req: any) => {
  // Prefer explicit server env; otherwise use the site the request came from.
  const configured = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  const origin = req.headers?.origin;
  return typeof origin === 'string' ? origin.replace(/\/+$/, '') : '';
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // The account being onboarded comes from the login token, not the request body
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !authUser) return res.status(401).json({ error: 'Sign in first.' });
  const userId = authUser.id;

  try {
    // 1. Fetch user from Supabase to check existing Stripe ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new Error('User not found in vault');

    let stripeAccountId = user.stripe_account_id;

    // 2. Create Stripe Express account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || authUser.email,
        metadata: { discflip_user_id: userId },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      // Update user in DB
      await supabase.from('users').update({ stripe_account_id: stripeAccountId }).eq('id', userId);
    }

    // 3. Create Account Link
    const appBaseUrl = getAppBaseUrl(req);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appBaseUrl}/?stripe=refresh`,
      return_url: `${appBaseUrl}/?stripe=success`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Onboarding Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
