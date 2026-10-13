/**
 * Row <-> object mapping between Supabase (snake_case columns, timestamptz) and the
 * app's TypeScript types (camelCase fields, millisecond timestamps).
 *
 * Every table the app reads/writes is listed in TABLES. Only listed columns are sent to
 * the database, so UI-only fields on an object never cause "column does not exist" errors.
 * Keep these lists in sync with database/schema.sql (the schema test checks this).
 */

export type TableName =
  | 'users'
  | 'auctions'
  | 'threads'
  | 'messages'
  | 'notifications'
  | 'reports'
  | 'bounties'
  | 'bounty_submissions'
  | 'trade_offers'
  | 'clubs';

interface TableSpec {
  columns: string[];
  /** timestamptz columns: ISO string in the DB, epoch milliseconds in the app */
  timestamps?: string[];
  /** app field name -> column name, for fields that don't follow the camel->snake rule */
  aliases?: Record<string, string>;
}

export const TABLES: Record<TableName, TableSpec> = {
  users: {
    columns: [
      'id',
      'name',
      'handle',
      'pdga_number',
      'email',
      'avatar',
      'rating',
      'balance',
      'payout_balance',
      'pending_balance',
      'total_sales',
      'bio',
      'location',
      'joined_date',
      'is_identity_verified',
      'is_pro_seller',
      'payment_methods',
      'bank_accounts',
      'shipping_addresses',
      'inventory',
      'following_ids',
      'favorite_user_ids',
      'blocked_user_ids',
      'muted_user_ids',
      'follower_count',
      'specialty_badges',
      'inventory_tags',
      'last_active',
      'strikes',
      'restriction_level',
      'restriction_expires',
      'spam_score',
      'is_system_admin',
      'has_seen_safety_onboarding',
      'has_accepted_legal_terms',
      'legal_accepted_at',
      'trades',
      'want_list',
      'saved_searches',
      'promotions',
      'club_id',
      'owned_club_id',
      'bounty_reliability_score',
      'avg_ship_time',
      'stripe_onboarding_complete',
      'requires_id_for_payout',
      'requires_tracked_shipping',
      'combined_shipping_config',
    ],
  },
  auctions: {
    columns: [
      'id',
      'seller_id',
      'seller',
      'title',
      'brand',
      'mold',
      'plastic',
      'weight',
      'color',
      'condition',
      'has_ink',
      'description',
      'image_url',
      'image_set',
      'rim_image',
      'profile_image',
      'weight_photo',
      'additional_images',
      'is_hidden',
      'is_under_review',
      'type',
      'current_bid',
      'end_time',
      'status',
      'bids',
      'category',
      'shipping_cost',
      'shipping_option',
      'start_price',
      'bid_count',
      'bid_increment',
      'anti_snipe',
      'duration',
      'shipping_price',
      'shipping_method',
      'handling_time',
      'location',
      'flight_numbers',
      'dome',
      'created_at',
      'buyer_id',
      'sold_price',
      'sold_at',
      'club_id',
      'confirmation_deadline',
      'tracking_number',
      'label_carrier',
      'admin_logs',
      'payout_status',
      'signature_required',
      'fulfillment_mode',
      'buyer_shipping_address',
      'buy_now_price',
      'start_time',
      'auto_relist',
      'tracking_included',
      'physical_location',
      'visibility',
      'flight_offset',
      'flex',
      'glow',
      'swirl',
      'feel_tags',
      'run',
      'foil_color',
      'stamp_type',
      'is_rarity',
      'rarity_tags',
      'is_autographed',
      'has_coa',
      'wear_history',
      'storage_notes',
      'smoke_free',
      'pet_free',
      'return_policy',
      'trade_accepted',
      'is_lot',
      'is_for_trade',
      'is_in_bag',
      'watcher_count',
      'view_count',
      'qr_code_id',
      'ink_location',
      'ink_heavy',
      'scuffs',
      'gouges',
      'warping',
      'high_bidder_id',
      'high_bidder_max_amount',
      'anti_snipe_window_ms',
      'bundle_id',
      'tracking_events',
      'payout_released',
      'packaging_proof_photo',
      'ship_by_date',
      'is_high_value_hold',
      'pickup_details',
      'additional_image_sets',
      'plastic_feel',
      'verification_tier',
      'shipping_label_url',
      'order_dispute',
    ],
    timestamps: ['created_at', 'sold_at'],
    aliases: { hasCOA: 'has_coa' },
  },
  threads: {
    columns: [
      'id',
      'type',
      'object_id',
      'participant_ids',
      'object_title',
      'object_image',
      'last_timestamp',
      'status',
      'buyer_id',
      'seller_id',
      'unread_count',
      'last_message',
      'is_spam_request',
    ],
  },
  messages: {
    columns: ['id', 'thread_id', 'sender_id', 'text', 'timestamp', 'is_read', 'offer'],
    timestamps: ['timestamp'],
  },
  notifications: {
    columns: ['id', 'user_id', 'type', 'title', 'message', 'target_id', 'is_read', 'created_at'],
    timestamps: ['created_at'],
    aliases: { timestamp: 'created_at' },
  },
  reports: {
    columns: [
      'id',
      'ticket_id',
      'reporter_id',
      'reporter_name',
      'target_type',
      'target_id',
      'target_owner_id',
      'category',
      'details',
      'evidence_photos',
      'context_snapshot',
      'status',
      'severity',
      'created_at',
      'club_id',
      'internal_notes',
    ],
    timestamps: ['created_at'],
    aliases: { timestamp: 'created_at' },
  },
  bounties: {
    columns: [
      'id',
      'buyer_id',
      'buyer_name',
      'type',
      'brand',
      'mold',
      'plastic',
      'weight_min',
      'weight_max',
      'color_preference',
      'color_must_be',
      'condition_min',
      'ink_allowed',
      'dome_preference',
      'glow_required',
      'must_be_unthrown',
      'price_offer',
      'price_is_shipped',
      'is_verified_bounty',
      'visibility',
      'status',
      'created_at',
      'expiration_date',
      'view_count',
      'auto_renew',
    ],
    timestamps: ['created_at'],
  },
  bounty_submissions: {
    columns: [
      'id',
      'bounty_id',
      'seller_id',
      'seller_name',
      'price_proposed',
      'notes',
      'image_url',
      'condition',
      'has_ink',
      'created_at',
    ],
    timestamps: ['created_at'],
    aliases: { timestamp: 'created_at' },
  },
  trade_offers: {
    columns: [
      'id',
      'sender_id',
      'sender_name',
      'receiver_id',
      'receiver_name',
      'sender_discs',
      'receiver_discs',
      'cash_adjustment',
      'status',
      'created_at',
    ],
    timestamps: ['created_at'],
    aliases: { timestamp: 'created_at' },
  },
  clubs: {
    columns: [
      'id',
      'name',
      'location',
      'logo',
      'admin_id',
      'member_ids',
      'pending_member_ids',
      'banned_member_ids',
      'member_count',
      'rating',
      'description',
      'is_verified',
      'fundraiser_goal',
      'fundraiser_raised',
    ],
  },
};

/** Columns of `users` that any signed-in user may read about other users. */
export const PUBLIC_USER_COLUMNS = [
  'id',
  'name',
  'handle',
  'pdga_number',
  'avatar',
  'rating',
  'total_sales',
  'bio',
  'location',
  'joined_date',
  'is_identity_verified',
  'is_pro_seller',
  'inventory',
  'follower_count',
  'specialty_badges',
  'inventory_tags',
  'last_active',
  'club_id',
  'owned_club_id',
  'bounty_reliability_score',
  'avg_ship_time',
  'combined_shipping_config',
  'stripe_onboarding_complete',
  'is_system_admin',
  'restriction_level',
];

export const camelToSnake = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

export const snakeToCamel = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const columnFor = (spec: TableSpec, key: string) => spec.aliases?.[key] ?? camelToSnake(key);

const fieldFor = (spec: TableSpec, column: string) => {
  if (spec.aliases) {
    const alias = Object.entries(spec.aliases).find(([, col]) => col === column);
    if (alias) return alias[0];
  }
  return snakeToCamel(column);
};

/** App object -> DB row. Drops unknown fields and `undefined` values. */
export function toRow(table: TableName, obj: Record<string, any>): Record<string, any> {
  const spec = TABLES[table];
  const row: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined) continue;
    const column = columnFor(spec, key);
    if (!spec.columns.includes(column)) continue;
    if (spec.timestamps?.includes(column) && typeof value === 'number') {
      row[column] = new Date(value).toISOString();
    } else {
      row[column] = value;
    }
  }
  return row;
}

/** DB row -> app object. `null` becomes `undefined` so optional fields behave as before. */
export function fromRow<T = any>(table: TableName, row: Record<string, any> | null | undefined): T {
  const spec = TABLES[table];
  const obj: Record<string, any> = {};
  for (const [column, value] of Object.entries(row || {})) {
    if (value === null) continue;
    const field = fieldFor(spec, column);
    if (spec.timestamps?.includes(column) && typeof value === 'string') {
      obj[field] = new Date(value).getTime();
    } else {
      obj[field] = value;
    }
  }
  return obj as T;
}

export const fromRows = <T = any>(
  table: TableName,
  rows: Record<string, any>[] | null | undefined
): T[] => (rows || []).map((r) => fromRow<T>(table, r));
