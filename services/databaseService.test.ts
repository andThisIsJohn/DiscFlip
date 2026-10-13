import { describe, it, expect, beforeEach, vi } from 'vitest';

// These tests exercise the offline demo ("mock") mode, so force it on even if
// .env.local points at a real Supabase project.
vi.mock('./config', () => ({
  Environment: { Development: 'development', Staging: 'staging', Production: 'production' },
  config: {
    env: 'development',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'test-key',
    stripePublicKey: 'pk_test_xxx',
    stripeClientId: 'ca_xxx',
    apiBaseUrl: '',
    isMockEnabled: true,
  },
}));

import { db } from './databaseService';
import { MOCK_USER } from '../constants';

describe('DatabaseService (mock mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return mock user in mock mode', async () => {
    const user = await db.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(MOCK_USER.id);
  });

  it('should correctly filter auctions', async () => {
    const auctions = await db.getAuctions();
    expect(Array.isArray(auctions)).toBe(true);
    expect(auctions.length).toBeGreaterThan(0);
  });

  it('gives new listings an end time and starting price', async () => {
    await db.saveAuction({ title: 'Test Buzzz', startPrice: 12, duration: 1 });
    const [newest] = await db.getAuctions();
    expect(newest.title).toBe('Test Buzzz');
    expect(newest.currentBid).toBe(12);
    expect(newest.endTime).toBeGreaterThan(Date.now());
  });

  it('rejects a bid below the minimum and accepts a valid one', async () => {
    const [auction] = await db.getAuctions();
    await expect(db.placeBid(auction.id, 'user_x', 1)).rejects.toThrow(/at least/);
    await db.placeBid(auction.id, 'user_x', auction.currentBid + 10);
    const updated = (await db.getAuctions()).find((a) => a.id === auction.id)!;
    expect(updated.highBidderId).toBe('user_x');
    expect(updated.bidCount).toBe(auction.bidCount + 1);
  });

  it('closes ended auctions with a winner who still owes payment', async () => {
    const [auction] = await db.getAuctions();
    await db.placeBid(auction.id, 'user_x', auction.currentBid + 5);
    const all = await db.getAuctions();
    localStorage.setItem(
      'discflip_db_auctions',
      JSON.stringify(all.map((a) => (a.id === auction.id ? { ...a, endTime: Date.now() - 1 } : a)))
    );
    await db.processAuctionEndings();
    const closed = (await db.getAuctions()).find((a) => a.id === auction.id)!;
    expect(closed.status).toBe('sold');
    expect(closed.buyerId).toBe('user_x');
    expect(closed.payoutStatus).toBe('unpaid');
  });
});
