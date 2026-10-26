import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypasses RLS to update backend records
);

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body for signature verification
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
      if (typeof chunk === 'string') {
        chunks.push(new TextEncoder().encode(chunk));
      } else {
        chunks.push(chunk);
      }
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const rawBody = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      rawBody.set(chunk, offset);
      offset += chunk.length;
    }

    // The platform endpoint and the connected-accounts endpoint each get their
    // own signing secret from Stripe, so accept either one.
    const secrets = [
      process.env.STRIPE_WEBHOOK_SECRET,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    ].filter(Boolean) as string[];
    if (secrets.length === 0) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

    let lastError: any;
    let verified: Stripe.Event | undefined;
    for (const secret of secrets) {
      try {
        verified = stripe.webhooks.constructEvent(rawBody as any, sig as any, secret);
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!verified) throw lastError;
    event = verified;
  } catch (err: any) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const buyerId = session.metadata?.buyer_id;
        const auctionIds: string[] = JSON.parse(session.metadata?.auction_ids || '[]');
        let shippingAddress: any = null;
        try {
          shippingAddress = session.metadata?.shipping_address
            ? JSON.parse(session.metadata.shipping_address)
            : null;
        } catch {
          shippingAddress = null;
        }

        let pickupIds: string[] = [];
        try {
          pickupIds = JSON.parse(session.metadata?.pickup_ids || '[]');
        } catch {
          pickupIds = [];
        }

        const { data: paidAuctions } = await supabase
          .from('auctions')
          .select('*')
          .in('id', auctionIds);
        const refunded: string[] = [];
        for (const a of paidAuctions || []) {
          const wonAuction = a.status === 'sold' && a.payout_status === 'unpaid';
          const isPickup = pickupIds.includes(a.id);
          const itemPrice = Number(
            wonAuction ? (a.sold_price ?? a.current_bid) : (a.buy_now_price ?? a.current_bid)
          );

          // Claim the item atomically: still for sale, or this buyer's unpaid win.
          // If someone else got it first (two Buy It Now clicks at once), refund this buyer.
          const { data: claimed } = await supabase
            .from('auctions')
            .update({
              status: 'sold',
              buyer_id: buyerId,
              sold_price: itemPrice,
              sold_at: a.sold_at || new Date().toISOString(),
              payout_status: 'pending',
              stripe_payment_intent_id: session.payment_intent as string,
              buyer_shipping_address: shippingAddress,
              fulfillment_mode: isPickup ? 'pickup' : 'shipping',
              ship_by_date: Date.now() + Math.max(1, Number(a.handling_time) || 3) * 86400000,
            })
            .eq('id', a.id)
            .or(
              `status.eq.active,and(status.eq.sold,payout_status.eq.unpaid,buyer_id.eq.${buyerId})`
            )
            .select('id');

          if (!claimed || claimed.length === 0) {
            const shipping = isPickup ? 0 : Number(a.shipping_price || a.shipping_cost || 0);
            await stripe.refunds.create(
              {
                payment_intent: session.payment_intent as string,
                amount: Math.round((itemPrice + shipping) * 100),
                metadata: { auction_id: a.id, reason: 'already_sold' },
              },
              { idempotencyKey: `sold-out-refund-${session.id}-${a.id}` }
            );
            refunded.push(a.id);
            await supabase.from('notifications').insert({
              user_id: buyerId,
              type: 'system_alert',
              title: 'Refunded: already sold',
              message: `${a.title || 'A disc'} sold to someone else a moment before you. You were refunded in full.`,
              target_id: a.id,
            });
            continue;
          }

          await supabase.from('notifications').insert({
            user_id: a.seller_id,
            type: 'item_sold',
            title: 'Paid — time to ship!',
            message: `${a.title || 'Your disc'} was paid for. ${isPickup ? 'Wait for the buyer to schedule pickup.' : 'Ship it from Account → Orders.'}`,
            target_id: a.id,
          });
        }

        // FORENSIC AUDIT
        await supabase.from('audit_logs').insert({
          user_id: buyerId,
          action: 'PAYMENT_COMPLETE',
          target_type: 'ORDER_BATCH',
          target_id: session.id,
          metadata: { auctionIds, refunded, status: 'paid' },
        });

        for (const id of auctionIds.filter((x) => !refunded.includes(x))) {
          await supabase.from('notifications').insert({
            user_id: buyerId,
            type: 'auction_won',
            title: 'Haul Secured!',
            message: `Payment successful for order ${id}. Seller notified.`,
            target_id: id,
          });
        }
        break;
      }

      case 'account.updated': {
        // Seller finished (or lost) Stripe Express onboarding
        const account = event.data.object as Stripe.Account;
        await supabase
          .from('users')
          .update({
            stripe_onboarding_complete: Boolean(account.charges_enabled && account.payouts_enabled),
          })
          .eq('stripe_account_id', account.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId = dispute.payment_intent as string;

        const { data: auction } = await supabase
          .from('auctions')
          .update({ status: 'disputed', payout_status: 'held' })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .select()
          .single();

        if (auction) {
          await supabase.from('audit_logs').insert({
            user_id: auction.seller_id,
            action: 'EXTERNAL_DISPUTE_TRIGGER',
            target_type: 'ORDER',
            target_id: auction.id,
            metadata: { stripeDisputeId: dispute.id, reason: dispute.reason },
          });

          await supabase.from('reports').insert({
            category: 'Scam',
            details: `Automated: Stripe Dispute created for PI ${paymentIntentId}`,
            target_type: 'Order',
            target_id: auction.id,
            severity: 'Critical',
            status: 'Received',
          });
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Database Error: ${error.message}`);
    return res.status(500).json({ error: 'Internal logic failure' });
  }
}
