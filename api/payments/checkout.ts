import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { wrapApiHandler } from '../_lib/middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const getAppBaseUrl = (req: any) => {
  // Prefer explicit server env; otherwise use the site the request came from.
  const configured = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  const origin = req.headers?.origin;
  return typeof origin === 'string' ? origin.replace(/\/+$/, '') : '';
};

async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Who is paying comes from their login token, not from the request body
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sign in to check out.' });
  const userId = user.id;

  const { items, shippingAddress } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Incomplete haul data' });
  }

  // 1. Verify and price every line item from the DB (prevents price spoofing)
  const auctionIds: string[] = items.map((i: any) => i.auctionId);
  const { data: auctions, error: dbError } = await supabase
    .from('auctions')
    .select('*')
    .in('id', auctionIds);

  if (dbError || !auctions || auctions.length !== auctionIds.length) {
    return res.status(400).json({ error: 'One or more items are no longer available.' });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const auction of auctions) {
    if (auction.seller_id === userId) {
      return res.status(400).json({ error: `You can't buy your own listing (${auction.title}).` });
    }

    let price: number | null = null;
    if (
      auction.status === 'sold' &&
      auction.buyer_id === userId &&
      auction.payout_status === 'unpaid'
    ) {
      // Auction you won: pay the winning bid
      price = Number(auction.sold_price ?? auction.current_bid);
    } else if (auction.status === 'active' && !auction.is_hidden && auction.buy_now_price) {
      // Buy It Now
      price = Number(auction.buy_now_price);
    }
    if (!price || price <= 0) {
      return res
        .status(400)
        .json({ error: `${auction.title || 'An item'} isn't available to buy right now.` });
    }

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: auction.title || `${auction.brand} ${auction.mold}`,
          description: `DiscFlip Secure Order: ${auction.id}`,
          images:
            auction.image_url && /^https:\/\//.test(auction.image_url) ? [auction.image_url] : [],
        },
        unit_amount: Math.round(price * 100), // Stripe uses cents
      },
      quantity: 1,
    });

    const isPickup = items.some(
      (i: any) => i.auctionId === auction.id && i.fulfillment === 'pickup'
    );
    const shipping = isPickup ? 0 : Number(auction.shipping_price || auction.shipping_cost || 0);
    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: `Shipping: ${auction.title || auction.mold}` },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }
  }

  // Keep the address small enough for Stripe metadata (500 chars per value)
  const address = shippingAddress
    ? {
        name: String(shippingAddress.name || '').slice(0, 80),
        street: String(shippingAddress.street || '').slice(0, 120),
        city: String(shippingAddress.city || '').slice(0, 60),
        state: String(shippingAddress.state || '').slice(0, 2),
        zip: String(shippingAddress.zip || '').slice(0, 10),
      }
    : null;

  // 2. Create Checkout Session
  const appBaseUrl = getAppBaseUrl(req);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: user.email,
    success_url: `${appBaseUrl}/?checkout=success`,
    cancel_url: `${appBaseUrl}/?checkout=cancel`,
    metadata: {
      buyer_id: userId,
      auction_ids: JSON.stringify(auctionIds),
      // items the buyer chose to collect in person (no shipping charge, pickup flow)
      pickup_ids: JSON.stringify(
        items.filter((i: any) => i.fulfillment === 'pickup').map((i: any) => i.auctionId)
      ).slice(0, 500),
      shipping_address: address ? JSON.stringify(address) : '',
    },
  });

  // 3. LOG AUDIT SIGNAL
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'PAYMENT_INITIATE',
    target_type: 'ORDER_BATCH',
    target_id: session.id,
    metadata: { auctionIds, amountCents: session.amount_total },
  });

  return res.status(200).json({ sessionId: session.id, url: session.url });
}

export default wrapApiHandler(handler);
