import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { wrapApiHandler } from '../_lib/middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** Admin-only: refund an order's payment in Stripe and close it. */
async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sign in first.' });

  const { data: admin } = await supabase
    .from('users')
    .select('is_system_admin')
    .eq('id', user.id)
    .single();
  if (!admin?.is_system_admin) return res.status(403).json({ error: 'Admins only.' });

  const { auctionId, reason } = req.body || {};
  if (!auctionId) return res.status(400).json({ error: 'Auction ID is required' });

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();
  if (error || !auction) return res.status(404).json({ error: 'Order not found' });
  if (auction.payout_status === 'released') {
    return res.status(409).json({
      error: 'The seller was already paid for this order; refund it from the Stripe dashboard.',
    });
  }

  let refundId: string | null = null;
  if (auction.stripe_payment_intent_id) {
    const refund = await stripe.refunds.create({
      payment_intent: auction.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: { auction_id: auctionId, admin_id: user.id },
    });
    refundId = refund.id;
  }

  await supabase
    .from('auctions')
    .update({ status: 'refunded', payout_status: 'refunded' })
    .eq('id', auctionId);

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'ADMIN_REFUND',
    target_type: 'AUCTION',
    target_id: auctionId,
    metadata: { refundId, reason },
  });

  if (auction.buyer_id) {
    await supabase.from('notifications').insert({
      user_id: auction.buyer_id,
      type: 'report_action_taken',
      title: 'Refund issued',
      message: `Your payment for ${auction.title || 'an order'} was refunded.`,
      target_id: auctionId,
    });
  }

  return res.status(200).json({ success: true, refundId });
}

export default wrapApiHandler(handler);
