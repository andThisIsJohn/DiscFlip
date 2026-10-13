import { supabaseAdmin as supabase } from '../_lib/auth';
import { releasePayout } from '../_lib/payout';

/**
 * Daily housekeeping, run by Vercel Cron (see vercel.json). Vercel calls it with
 * `Authorization: Bearer <CRON_SECRET>`; anyone else is turned away.
 *  1. closes ended auctions and relists wins unpaid after 48h
 *  2. completes delivered orders whose 72h confirmation window ran out
 *  3. pays sellers for completed orders that haven't been paid yet (e.g. they connected
 *     Stripe late, or the buyer's app closed before the payout call)
 */
export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const report: Record<string, any> = {};

  const { data: closed, error: closeError } = await supabase.rpc('finalize_ended_auctions');
  report.auctionsClosedOrRelisted = closeError ? `error: ${closeError.message}` : closed;

  const { data: completed, error: completeError } = await supabase.rpc(
    'complete_overdue_deliveries'
  );
  report.autoCompleted = completeError
    ? `error: ${completeError.message}`
    : (completed || []).length;

  const { data: owed } = await supabase
    .from('auctions')
    .select('id')
    .eq('status', 'completed')
    .eq('payout_status', 'pending')
    .limit(50);

  const payouts: Record<string, string> = {};
  for (const { id } of owed || []) {
    try {
      const r: any = await releasePayout(id, null);
      payouts[id] = r.transferId ? `paid ${r.transferId}` : 'already paid';
    } catch (err: any) {
      payouts[id] = `waiting: ${err.message}`;
    }
  }
  report.payouts = payouts;

  console.log(JSON.stringify({ level: 'INFO', job: 'maintenance', ...report }));
  return res.status(200).json(report);
}
