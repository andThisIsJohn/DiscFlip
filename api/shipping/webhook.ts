
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { result: tracker } = req.body;
  if (!tracker || tracker.object !== 'Tracker') return res.status(400).send('Invalid Tracker Object');

  try {
    const trackingCode = tracker.tracking_code;
    const status = tracker.status; // status: 'pre_transit', 'in_transit', 'out_for_delivery', 'delivered', 'return_to_sender'
    
    // Map EasyPost status to DiscFlip OrderStatus
    let orderStatus = 'label_created';
    if (status === 'in_transit' || status === 'out_for_delivery') orderStatus = 'in_transit';
    if (status === 'delivered') orderStatus = 'delivered';
    if (status === 'return_to_sender') orderStatus = 'refunded';

    // Build event list
    const trackingEvents = tracker.tracking_details.map((d: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(d.datetime).getTime(),
        location: `${d.tracking_location.city || 'Transit Hub'}, ${d.tracking_location.state || ''}`,
        message: d.message,
        type: d.status === 'delivered' ? 'delivery' : 'scan'
    }));

    // Update Auction
    const updatePayload: any = {
        tracking_events: trackingEvents
    };

    // Only update order status if it's a forward progression
    if (orderStatus !== 'label_created') {
        updatePayload.status = orderStatus;
        if (orderStatus === 'delivered') {
            updatePayload.confirmation_deadline = Date.now() + (72 * 60 * 60 * 1000); // 72h window
        }
    }

    await supabase
      .from('auctions')
      .update(updatePayload)
      .eq('tracking_number', trackingCode);

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Shipping Webhook Error:', error.message);
    return res.status(500).json({ error: 'Internal Signal Failure' });
  }
}
