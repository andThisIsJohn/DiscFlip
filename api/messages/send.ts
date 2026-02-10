
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { threadId, text } = req.body;

  try {
    // 1. SCAM SCAN (Server-side)
    const blacklist = /\b(venmo|zelle|cashapp|paypal f&f|outside the app|pay me directly|text me)\b/i;
    if (blacklist.test(text)) {
        // Log strike automatically
        await supabase.rpc('increment_user_strikes', { p_user_id: user.id });
        return res.status(403).json({ error: 'Message blocked: Off-platform payment signals detected.' });
    }

    // 2. PII SCRUB
    const scrubbed = text
        .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, "[EMAIL MASKED]")
        .replace(/(\+?\d{1,4}?[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, "[PHONE MASKED]");

    // 3. Authorized Send
    const { error } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        text: scrubbed,
        timestamp: new Date().toISOString()
    });

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
