import { createClient } from '@supabase/supabase-js';
import { wrapApiHandler } from '../_lib/middleware';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) return res.status(401).json({ error: 'Vault authentication required' });

  const { auctionData: rawData } = req.body || {};
  if (!rawData || typeof rawData !== 'object')
    return res.status(400).json({ error: 'Missing listing data' });

  // The client sends snake_case columns (services/mappers.ts). Strip anything the seller
  // must not set themselves, then fill in server-controlled values below.
  const SERVER_CONTROLLED = [
    'id',
    'seller_id',
    'seller',
    'status',
    'buyer_id',
    'sold_price',
    'sold_at',
    'payout_status',
    'payout_released',
    'high_bidder_id',
    'bid_count',
    'bids',
    'created_at',
    'tracking_number',
    'tracking_events',
    'is_under_review',
    'stripe_payment_intent_id',
    'easypost_shipment_id',
    'shipping_label_url',
    'buyer_shipping_address',
    'current_bid',
  ];
  const auctionData: Record<string, any> = { ...rawData };
  SERVER_CONTROLLED.forEach((key) => delete auctionData[key]);

  // 1. Fetch User Safety Signals
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;

  // 2. Enforce High-Value Safety Protocol
  const isUnverified = !profile.is_identity_verified;
  if (
    isUnverified &&
    ((auctionData.start_price || 0) > 100 || (auctionData.buy_now_price || 0) > 150)
  ) {
    return res.status(403).json({
      error:
        'Safety Limit: Unverified hunters are capped at $100. Complete KYC to list high-value plastic.',
    });
  }

  // 3. Prevent Listing Spam
  const { count, error: countError } = await supabase
    .from('auctions')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .eq('status', 'active');

  if (countError) throw countError;

  if ((count || 0) >= 50 && !profile.is_pro_seller) {
    return res.status(429).json({ error: 'Standard Vault Limit: Maximum 50 active listings.' });
  }

  if (
    ['Banned', 'Account Freeze'].includes(profile.restriction_level) &&
    (!profile.restriction_expires || profile.restriction_expires > Date.now())
  ) {
    return res.status(403).json({ error: 'Your account is restricted from listing right now.' });
  }

  // 4. Authorized Create
  const now = Date.now();
  const durationDays = Number(auctionData.duration) || 3;
  const { data, error } = await supabase
    .from('auctions')
    .insert({
      ...auctionData,
      seller_id: user.id,
      seller: profile.name,
      status: 'active',
      bid_count: 0,
      bids: [],
      current_bid: auctionData.start_price || 0,
      start_time: now,
      end_time:
        auctionData.end_time && auctionData.end_time > now
          ? auctionData.end_time
          : now + durationDays * 86400000,
      created_at: new Date(now).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return res.status(200).json(data);
}

export default wrapApiHandler(handler);
