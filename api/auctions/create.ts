
import { createClient } from '@supabase/supabase-js';
import { wrapApiHandler } from '../lib/middleware';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) return res.status(401).json({ error: 'Vault authentication required' });

  const { auctionData } = req.body;

  // 1. Fetch User Safety Signals
  const { data: profile, error: profileError } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (profileError) throw profileError;
  
  // 2. Enforce High-Value Safety Protocol
  const isUnverified = !profile.is_identity_verified;
  if (isUnverified && (auctionData.startPrice > 100 || (auctionData.buyNowPrice || 0) > 150)) {
      return res.status(403).json({ 
          error: 'Safety Limit: Unverified hunters are capped at $100. Complete KYC to list high-value plastic.' 
      });
  }

  // 3. Prevent Listing Spam
  const { count, error: countError } = await supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active');
  
  if (countError) throw countError;
      
  if ((count || 0) > 50 && !profile.is_pro_seller) {
      return res.status(429).json({ error: 'Standard Vault Limit: Maximum 50 active listings.' });
  }

  // 4. Authorized Create
  const { data, error } = await supabase
      .from('auctions')
      .insert({
          ...auctionData,
          seller_id: user.id,
          status: 'active',
          created_at: new Date().toISOString()
      })
      .select()
      .single();

  if (error) throw error;
  return res.status(200).json(data);
}

export default wrapApiHandler(handler);
