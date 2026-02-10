
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { wrapApiHandler } from '../lib/middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getAppBaseUrl = () => {
  // Prefer explicit server env; fallback to legacy Vite var if you already set it.
  return (process.env.APP_BASE_URL || process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
};


async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, items } = req.body;
  if (!userId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Incomplete haul data' });
  }

  try {
    // 1. Verify and map line items from DB (Prevent price spoofing)
    const auctionIds = items.map((i: any) => i.auctionId);
    const { data: auctions, error: dbError } = await supabase
      .from('auctions')
      .select('*')
      .in('id', auctionIds);

    if (dbError || !auctions) throw new Error('Could not verify auction integrity');

    const lineItems = auctions.map(auction => {
        const item = items.find((i: any) => i.auctionId === auction.id);
        const price = auction.buy_now_price || auction.current_bid;
        
        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${auction.brand} ${auction.mold}`,
                    description: `DiscFlip Secure Order: ${auction.id}`,
                    images: [auction.image_url],
                },
                unit_amount: Math.round(price * 100), // Stripe uses cents
            },
            quantity: 1,
        };
    });

    // 2. Create Checkout Session
    const appBaseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appBaseUrl}/account?checkout=success`,
      cancel_url: `${appBaseUrl}/market?checkout=cancel`,
      metadata: {
        buyer_id: userId,
        auction_ids: JSON.stringify(auctionIds),
      },
    });

    // 3. LOG AUDIT SIGNAL
    await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'PAYMENT_INITIATE',
        target_type: 'ORDER_BATCH',
        target_id: session.id,
        metadata: { auctionIds, amountCents: session.amount_total }
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default wrapApiHandler(handler);
