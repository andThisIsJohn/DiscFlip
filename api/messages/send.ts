import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { threadId, text, offer } = req.body || {};
  if (!threadId || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }
  if (text.length > 4000) return res.status(413).json({ error: 'Message is too long' });

  try {
    // 0. Only people in the conversation can post to it, and not if either side blocked the other
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id, participant_ids, buyer_id, seller_id')
      .eq('id', threadId)
      .maybeSingle();
    if (threadError) throw threadError;
    if (!thread || !(thread.participant_ids || []).includes(user.id)) {
      return res.status(403).json({ error: 'You are not part of this conversation.' });
    }
    const { data: blocked } = await supabase.rpc('is_socially_blocked', {
      user_a: thread.buyer_id,
      user_b: thread.seller_id,
    });
    if (blocked)
      return res.status(403).json({ error: 'Messaging is disabled between these accounts.' });

    const { data: sender } = await supabase
      .from('users')
      .select('restriction_level, restriction_expires')
      .eq('id', user.id)
      .single();
    if (
      sender &&
      ['Restricted Messaging', 'Account Freeze', 'Banned'].includes(sender.restriction_level) &&
      (!sender.restriction_expires || sender.restriction_expires > Date.now())
    ) {
      return res
        .status(403)
        .json({ error: 'Your account is restricted from messaging right now.' });
    }

    // 1. SCAM SCAN (Server-side)
    const blacklist =
      /\b(venmo|zelle|cashapp|cash app|paypal f&f|friends and family|whatsapp|outside the app|pay me directly|text me)\b/i;
    if (blacklist.test(text)) {
      // Log strike automatically
      await supabase.rpc('increment_user_strikes', { p_user_id: user.id });
      return res
        .status(403)
        .json({ error: 'Message blocked: Off-platform payment signals detected.' });
    }

    // 2. PII SCRUB
    const scrubbed = text
      .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '[EMAIL MASKED]')
      .replace(/(\+?\d{1,4}?[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, '[PHONE MASKED]');

    // 3. Authorized Send (a database trigger updates the thread preview and notifies the other side)
    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      text: scrubbed,
      offer: offer && typeof offer === 'object' ? offer : null,
      timestamp: new Date().toISOString(),
    });

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
