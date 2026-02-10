
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

    event = stripe.webhooks.constructEvent(
      rawBody as any,
      sig as any,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const buyerId = session.metadata?.buyer_id;
        const auctionIds = JSON.parse(session.metadata?.auction_ids || '[]');

        await supabase
          .from('auctions')
          .update({
            status: 'sold',
            buyer_id: buyerId,
            sold_at: new Date().toISOString(),
            payout_status: 'pending',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .in('id', auctionIds);

        // FORENSIC AUDIT
        await supabase.from('audit_logs').insert({
            user_id: buyerId,
            action: 'PAYMENT_COMPLETE',
            target_type: 'ORDER_BATCH',
            target_id: session.id,
            metadata: { auctionIds, status: 'paid' }
        });

        for (const id of auctionIds) {
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
            metadata: { stripeDisputeId: dispute.id, reason: dispute.reason }
          });

          await supabase.from('reports').insert({
            category: 'Scam',
            details: `Automated: Stripe Dispute created for PI ${paymentIntentId}`,
            target_type: 'Order',
            target_id: auction.id,
            severity: 'Critical',
            status: 'Received'
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
