import Stripe from 'stripe';
import { supabaseAdmin as supabase } from './auth';
import { sellerPayoutCents } from './fees';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export class PayoutError extends Error {
  constructor(
    message: string,
    public status = 409
  ) {
    super(message);
  }
}

/**
 * Sends the seller their share (item price minus the 10% marketplace fee) for a completed,
 * paid order. Safe to call twice: Stripe ignores a repeated idempotency key and the order
 * is marked released afterwards.
 */
export async function releasePayout(auctionId: string, actorId: string | null) {
  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*, users!seller_id(stripe_account_id)')
    .eq('id', auctionId)
    .single();
  if (error || !auction) throw new PayoutError('Order not found', 404);

  if (auction.payout_status === 'released') return { alreadyReleased: true as const };
  if (auction.status !== 'completed' || auction.payout_status !== 'pending') {
    throw new PayoutError('This order is not ready for payout.');
  }
  if (!auction.stripe_payment_intent_id) {
    throw new PayoutError('No Stripe payment is recorded for this order.');
  }
  const sellerStripeId = (auction.users as any)?.stripe_account_id;
  if (!sellerStripeId) {
    throw new PayoutError('The seller has not connected Stripe yet; the payout will wait.');
  }

  const amountCents = sellerPayoutCents(Number(auction.sold_price ?? auction.current_bid));

  // Tie the transfer to the buyer's charge so it works before the funds settle
  const paymentIntent = await stripe.paymentIntents.retrieve(auction.stripe_payment_intent_id);
  const chargeId =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

  const transfer = await stripe.transfers.create(
    {
      amount: amountCents,
      currency: 'usd',
      destination: sellerStripeId,
      description: `DiscFlip payout for order ${auctionId}`,
      metadata: { auction_id: auctionId },
      ...(chargeId ? { source_transaction: chargeId } : {}),
    },
    { idempotencyKey: `escrow-release-${auctionId}` }
  );

  await supabase
    .from('auctions')
    .update({ payout_status: 'released', payout_released: true })
    .eq('id', auctionId);

  await supabase.from('audit_logs').insert({
    user_id: actorId,
    action: 'ESCROW_RELEASE',
    target_type: 'AUCTION',
    target_id: auctionId,
    metadata: { transferId: transfer.id, amountCents, sellerId: auction.seller_id },
  });

  await supabase.from('notifications').insert({
    user_id: auction.seller_id,
    type: 'payout_success',
    title: 'Payout sent',
    message: `$${(amountCents / 100).toFixed(2)} for ${auction.title || 'your disc'} is on its way to your Stripe account.`,
    target_id: auctionId,
  });

  return { transferId: transfer.id, amountCents };
}
