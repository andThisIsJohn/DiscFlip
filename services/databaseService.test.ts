
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './databaseService';
import { MOCK_USER } from '../constants';

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mock user in mock mode', async () => {
    // We assume config.isMockEnabled is true for local testing
    const user = await db.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(MOCK_USER.id);
  });

  it('should correctly filter auctions', async () => {
    const auctions = await db.getAuctions();
    expect(Array.isArray(auctions)).toBe(true);
    expect(auctions.length).toBeGreaterThan(0);
  });
});
