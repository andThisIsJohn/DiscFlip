
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
+  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;

const getEasyPostAuthHeader = () => {
  if (!EASYPOST_API_KEY) throw new Error('EASYPOST_API_KEY is not configured');
  // Node/serverless-safe base64 for HTTP Basic auth: base64("KEY:")
  const token = Buffer.from(`${EASYPOST_API_KEY}:`, 'utf8').toString('base64');
  return `Basic ${token}`;
};


export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { auctionId, carrier, preset, weightOz } = req.body;

  try {
    // 1. Fetch Order Data
    const { data: auction, error: aError } = await supabase
      .from('auctions')
      .select('*, users!seller_id(name, location)')
      .eq('id', auctionId)
      .single();

    if (aError || !auction) throw new Error('Auction forensics not found');

    const buyerAddr = auction.buyer_shipping_address;
    const seller = auction.users;

    // 2. EasyPost Shipment Creation
    // Added fix: Replaced Buffer.from(...).toString('base64') with btoa() to resolve 'Cannot find name Buffer'
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': getEasyPostAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shipment: {
          to_address: {
            name: buyerAddr.name,
            street1: buyerAddr.street,
            city: buyerAddr.city,
            state: buyerAddr.state,
            zip: buyerAddr.zip,
            country: 'US'
          },
          from_address: {
            name: seller.name,
            street1: seller.location, // Assuming seller location is an address string
            city: 'Charlotte', // Placeholder: Should be parsed from location
            state: 'NC',
            zip: '28202',
            country: 'US'
          },
          parcel: {
            length: preset.length,
            width: preset.width,
            height: preset.height,
            weight: weightOz
          },
          service: carrier === 'USPS' ? 'GroundAdvantage' : 'Ground'
        }
      })
    });

    const shipment = await response.json();
    if (shipment.error) throw new Error(shipment.error.message);

    // 3. Purchase the lowest rate (or selected carrier)
    // Added fix: Replaced Buffer.from(...).toString('base64') with btoa() to resolve 'Cannot find name Buffer'
    const purchaseResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipment.id}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': getEasyPostAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rate: shipment.rates[0] })
    });

    const label = await purchaseResponse.json();

    // 4. Update Database
    await supabase
      .from('auctions')
      .update({
        status: 'label_created',
        tracking_number: label.tracking_code,
        label_carrier: carrier,
        easypost_shipment_id: label.id,
        shipping_label_url: label.postage_label.label_url
      })
      .eq('id', auctionId);

    return res.status(200).json({ 
        tracking: label.tracking_code, 
        labelUrl: label.postage_label.label_url 
    });
  } catch (error: any) {
    console.error('Shipping Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
