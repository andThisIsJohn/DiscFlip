import crypto from 'crypto';
import { supabaseAdmin as supabase } from '../_lib/auth';
import { readRawBody } from '../_lib/rawBody';

export const config = { api: { bodyParser: false } };

/**
 * EasyPost signs each webhook with the secret you typed when creating it:
 * header `X-Hmac-Signature: hmac-sha256-hex=<hex>` over the raw body.
 */
function verifyEasyPostSignature(rawBody: Buffer, header: string | undefined): boolean {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const expected =
    'hmac-sha256-hex=' +
    crypto.createHmac('sha256', secret.normalize('NFKD')).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Order statuses a tracking update is allowed to move forward from
const SHIPPING_FLOW = ['sold', 'packed', 'label_created', 'carrier_scanned', 'in_transit'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = await readRawBody(req);
  if (!verifyEasyPostSignature(rawBody, req.headers['x-hmac-signature'])) {
    return res.status(401).send('Invalid signature');
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  const tracker = event?.result;
  if (!tracker || tracker.object !== 'Tracker') return res.status(200).json({ ignored: true });

  try {
    const { data: order } = await supabase
      .from('auctions')
      .select('id, status, buyer_id, seller_id, title')
      .eq('tracking_number', tracker.tracking_code)
      .maybeSingle();
    if (!order) return res.status(200).json({ ignored: true });

    const trackingEvents = (tracker.tracking_details || []).map((d: any, i: number) => ({
      id: `${tracker.id}-${i}`,
      timestamp: new Date(d.datetime).getTime(),
      location: `${d.tracking_location?.city || 'Transit Hub'}, ${d.tracking_location?.state || ''}`,
      message: d.message,
      type: d.status === 'delivered' ? 'delivery' : 'scan',
    }));

    const update: Record<string, any> = { tracking_events: trackingEvents };
    const status = tracker.status;

    // Only move the order forward; never undo a completed, disputed or refunded order
    if (SHIPPING_FLOW.includes(order.status)) {
      if (status === 'in_transit' || status === 'out_for_delivery') {
        update.status = 'in_transit';
      } else if (status === 'delivered') {
        update.status = 'delivered';
        update.confirmation_deadline = Date.now() + 72 * 60 * 60 * 1000; // 72h to confirm
        await supabase.from('notifications').insert({
          user_id: order.buyer_id,
          type: 'delivered',
          title: 'Delivered!',
          message: `${order.title || 'Your disc'} was delivered. Confirm it arrived as described within 72 hours.`,
          target_id: order.id,
        });
      } else if (status === 'return_to_sender' || status === 'failure') {
        // Not an automatic refund: hold the payout and let an admin sort it out
        update.status = 'disputed';
        update.payout_status = 'held';
        await supabase.from('reports').insert({
          category: 'Other Violation',
          details: `Automated: carrier reported "${status}" for tracking ${tracker.tracking_code}`,
          target_type: 'Order',
          target_id: order.id,
          severity: 'High',
          status: 'Received',
        });
      }
    }

    await supabase.from('auctions').update(update).eq('id', order.id);
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Shipping Webhook Error:', error.message);
    return res.status(500).json({ error: 'Internal Signal Failure' });
  }
}
