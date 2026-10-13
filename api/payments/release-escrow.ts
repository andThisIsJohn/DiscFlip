import { wrapApiHandler } from '../_lib/middleware';
import { supabaseAdmin as supabase, getRequestUser, isSystemAdmin } from '../_lib/auth';
import { releasePayout, PayoutError } from '../_lib/payout';

/**
 * Pays the seller once an order is complete. Only the order's buyer (right after confirming
 * delivery or pickup) or an admin can trigger it; the daily maintenance job covers orders
 * that auto-complete.
 */
async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in first.' });

  const { auctionId } = req.body || {};
  if (!auctionId) return res.status(400).json({ error: 'Auction ID is required' });

  const { data: order } = await supabase
    .from('auctions')
    .select('buyer_id')
    .eq('id', auctionId)
    .maybeSingle();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.buyer_id !== user.id && !(await isSystemAdmin(user.id))) {
    return res.status(403).json({ error: 'Only the buyer or an admin can release this payout.' });
  }

  try {
    const result = await releasePayout(auctionId, user.id);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof PayoutError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

export default wrapApiHandler(handler);
