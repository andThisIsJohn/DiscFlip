import { supabaseAdmin as supabase, getRequestUser } from '../_lib/auth';

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;

const getEasyPostAuthHeader = () => {
  if (!EASYPOST_API_KEY) throw new Error('EASYPOST_API_KEY is not configured');
  // Node/serverless-safe base64 for HTTP Basic auth: base64("KEY:")
  const token = Buffer.from(`${EASYPOST_API_KEY}:`, 'utf8').toString('base64');
  return `Basic ${token}`;
};

// Cheapest rate for the chosen carrier (falls back to cheapest overall)
const pickRate = (rates: any[], carrier: string) => {
  if (!rates.length) throw new Error('The carrier returned no rates for this package');
  const byPrice = (a: any, b: any) => Number(a.rate) - Number(b.rate);
  const forCarrier = rates.filter(
    (r) => String(r.carrier).toUpperCase() === String(carrier).toUpperCase()
  );
  return (forCarrier.length ? forCarrier : rates).sort(byPrice)[0];
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Labels are bought on DiscFlip's EasyPost account, so only the seller of a paid order may buy one
  const user = await getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in first.' });

  const { auctionId, carrier, preset, weightOz } = req.body || {};
  const dims = [preset?.length, preset?.width, preset?.height, weightOz].map(Number);
  if (!auctionId || dims.some((n) => !Number.isFinite(n) || n <= 0 || n > 1000)) {
    return res.status(400).json({ error: 'Package size and weight are required.' });
  }
  if (!['USPS', 'UPS'].includes(carrier)) return res.status(400).json({ error: 'Unknown carrier' });

  try {
    // 1. Fetch Order Data
    const { data: auction, error: aError } = await supabase
      .from('auctions')
      .select('*, users!seller_id(name, location, shipping_addresses)')
      .eq('id', auctionId)
      .single();

    if (aError || !auction) return res.status(404).json({ error: 'Order not found' });
    if (auction.seller_id !== user.id) {
      return res.status(403).json({ error: 'Only the seller can buy a label for this order.' });
    }
    if (auction.payout_status !== 'pending' || !['sold', 'packed'].includes(auction.status)) {
      return res
        .status(409)
        .json({ error: 'A label can only be bought for a paid order that has not shipped yet.' });
    }
    if (auction.fulfillment_mode === 'pickup') {
      return res.status(409).json({ error: 'This order is a local pickup; no label needed.' });
    }

    const buyerAddr = auction.buyer_shipping_address;
    if (!buyerAddr) throw new Error('Buyer has no shipping address on this order');
    const seller = auction.users;

    // Ship-from = the seller's default saved address (Account → Addresses)
    const sellerAddresses: any[] = seller?.shipping_addresses || [];
    const fromAddr = sellerAddresses.find((a) => a.isDefault) || sellerAddresses[0];
    if (!fromAddr) {
      return res.status(400).json({
        error: 'Add a ship-from address to your account before buying a label.',
      });
    }

    // 2. EasyPost Shipment Creation
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        Authorization: getEasyPostAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment: {
          to_address: {
            name: buyerAddr.name,
            street1: buyerAddr.street,
            city: buyerAddr.city,
            state: buyerAddr.state,
            zip: buyerAddr.zip,
            country: 'US',
          },
          from_address: {
            name: fromAddr.name || seller.name,
            street1: fromAddr.street,
            city: fromAddr.city,
            state: fromAddr.state,
            zip: fromAddr.zip,
            country: 'US',
          },
          parcel: {
            length: dims[0],
            width: dims[1],
            height: dims[2],
            weight: dims[3],
          },
        },
      }),
    });

    const shipment = await response.json();
    if (shipment.error) throw new Error(shipment.error.message);

    // 3. Purchase the lowest rate (or selected carrier)
    const purchaseResponse = await fetch(
      `https://api.easypost.com/v2/shipments/${shipment.id}/buy`,
      {
        method: 'POST',
        headers: {
          Authorization: getEasyPostAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rate: { id: pickRate(shipment.rates || [], carrier).id } }),
      }
    );

    const label = await purchaseResponse.json();
    if (label.error) throw new Error(label.error.message);

    // 4. Update Database
    await supabase
      .from('auctions')
      .update({
        status: 'label_created',
        tracking_number: label.tracking_code,
        label_carrier: carrier,
        easypost_shipment_id: label.id,
        shipping_label_url: label.postage_label.label_url,
      })
      .eq('id', auctionId);

    return res.status(200).json({
      tracking: label.tracking_code,
      labelUrl: label.postage_label.label_url,
    });
  } catch (error: any) {
    console.error('Shipping Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
