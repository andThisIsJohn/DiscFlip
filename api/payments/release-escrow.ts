
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

async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { auctionId } = req.body;
  if (!auctionId) return res.status(400).json({ error: 'Auction ID is required' });

  try {
    const { data: auction, error: aError } = await supabase
      .from('auctions')
      .select('*, users!seller_id(stripe_account_id)')
      .eq('id', auctionId)
      .single();

    if (aError || !auction) throw new Error('Auction signal not found');
    
    const sellerStripeId = (auction.users as any).stripe_account_id;
    if (!sellerStripeId) throw new Error('Seller has not connected their vault');

    if (!['delivered', 'completed'].includes(auction.status)) {
        throw new Error('Haul is not in a releasable state');
    }

    if (auction.payout_status === 'released') {
        return res.status(200).json({ message: 'Credits already released' });
    }

    const amount = auction.sold_price || auction.current_bid;
    const platformFee = amount * 0.10;
    const transferAmountCents = Math.round((amount - platformFee) * 100);

    const transfer = await stripe.transfers.create({
      amount: transferAmountCents,
      currency: 'usd',
      destination: sellerStripeId,
      description: `Escrow release for order ${auctionId}`,
      metadata: { auction_id: auctionId },
    });

    await supabase
      .from('auctions')
      .update({ 
          payout_status: 'released',
          payout_released: true 
      })
      .eq('id', auctionId);

    // AUDIT ESCROW RELEASE
    await supabase.from('audit_logs').insert({
        action: 'ESCROW_RELEASE',
        target_type: 'AUCTION',
        target_id: auctionId,
        metadata: { transferId: transfer.id, amountCents: transferAmountCents, sellerId: auction.seller_id }
    });

    return res.status(200).json({ success: true, transferId: transfer.id });
  } catch (error: any) {
    console.error('Escrow Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default wrapApiHandler(handler);
