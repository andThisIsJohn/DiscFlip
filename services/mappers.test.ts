import { describe, it, expect } from 'vitest';
import { toRow, fromRow, camelToSnake, snakeToCamel } from './mappers';

describe('mappers', () => {
  it('converts field names both ways', () => {
    expect(camelToSnake('buyNowPrice')).toBe('buy_now_price');
    expect(camelToSnake('pdgaNumber')).toBe('pdga_number');
    expect(snakeToCamel('anti_snipe_window_ms')).toBe('antiSnipeWindowMs');
  });

  it('drops unknown fields and converts timestamps when writing', () => {
    const row = toRow('auctions', {
      title: 'Destroyer',
      notAColumn: 1,
      createdAt: 0,
      hasCOA: true,
      buyNowPrice: undefined,
    });
    expect(row).toEqual({
      title: 'Destroyer',
      created_at: '1970-01-01T00:00:00.000Z',
      has_coa: true,
    });
  });

  it('maps rows back to app objects', () => {
    const obj = fromRow('notifications', {
      id: 'n1',
      is_read: false,
      created_at: '1970-01-01T00:00:01.000Z',
      target_id: null,
    });
    expect(obj).toEqual({ id: 'n1', isRead: false, timestamp: 1000 });
  });
});
