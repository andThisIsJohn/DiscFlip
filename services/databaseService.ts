import { config } from './config';
import { supabase } from './supabaseClient';
import { storage } from './storageService';
import { toRow, fromRow, fromRows, PUBLIC_USER_COLUMNS } from './mappers';
import {
  DiscAuction,
  Message,
  UserReport,
  ReportStatus,
  User,
  SellerPerformance,
  TradeOffer,
  TradeStatus,
  DiscClub,
  Bounty,
  AppNotification,
  InfraHealth,
  Thread,
  TrackingEvent,
  OrderDispute,
  RestrictionLevel,
  ReportTargetType,
  BountySubmission,
  ReportCategory,
  ReportSeverity,
  PickupDetails,
  BountyStatus,
  AuctionType,
} from '../types';
import { MOCK_USER, OTHER_USERS, INITIAL_AUCTIONS, CLUBS } from '../constants';

/**
 * DatabaseService
 *
 * Two modes, chosen in services/config.ts:
 *  - Mock mode (no VITE_SUPABASE_URL): everything lives in the browser's localStorage with demo data.
 *  - Live mode: everything goes to Supabase. Sensitive state changes (bids, order status, payouts,
 *    moderation, club membership) go through database functions defined in database/schema.sql
 *    so the browser can't write them directly.
 */

/** Columns a signed-in user may change on their own profile (mirrors the GRANT in schema.sql). */
const SELF_EDITABLE_USER_COLUMNS = [
  'name',
  'handle',
  'pdga_number',
  'avatar',
  'bio',
  'location',
  'payment_methods',
  'bank_accounts',
  'shipping_addresses',
  'inventory',
  'following_ids',
  'favorite_user_ids',
  'blocked_user_ids',
  'muted_user_ids',
  'specialty_badges',
  'inventory_tags',
  'last_active',
  'has_seen_safety_onboarding',
  'has_accepted_legal_terms',
  'legal_accepted_at',
  'trades',
  'want_list',
  'saved_searches',
  'promotions',
  'combined_shipping_config',
  'avg_ship_time',
];

const newId = () => Math.random().toString(36).substr(2, 9);

/** Make sure every array/number field the UI relies on exists, even for partial (public) profiles. */
const normalizeUser = (u: Partial<User>): User =>
  ({
    name: 'Hunter',
    handle: '',
    email: '',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id || 'hunter'}`,
    rating: 5,
    balance: 0,
    payoutBalance: 0,
    pendingBalance: 0,
    totalSales: 0,
    bio: '',
    location: '',
    joinedDate: Date.now(),
    isIdentityVerified: false,
    isProSeller: false,
    lastActive: Date.now(),
    followerCount: 0,
    strikes: 0,
    restrictionLevel: RestrictionLevel.None,
    spamScore: 0,
    ...u,
    paymentMethods: u.paymentMethods || [],
    bankAccounts: u.bankAccounts || [],
    shippingAddresses: u.shippingAddresses || [],
    inventory: u.inventory || [],
    notifications: u.notifications || [],
    followingIds: u.followingIds || [],
    favoriteUserIds: u.favoriteUserIds || [],
    blockedUserIds: u.blockedUserIds || [],
    mutedUserIds: u.mutedUserIds || [],
    specialtyBadges: u.specialtyBadges || [],
    inventoryTags: u.inventoryTags || [],
  }) as User;

const normalizeAuction = (a: Partial<DiscAuction>): DiscAuction =>
  ({
    ...a,
    bids: a.bids || [],
    bidCount: a.bidCount || 0,
    currentBid: a.currentBid ?? a.startPrice ?? 0,
    flightNumbers: a.flightNumbers || { speed: 0, glide: 0, turn: 0, fade: 0 },
  }) as DiscAuction;

/** Throw a readable error from a Supabase response. */
const check = <T>(res: { data: T; error: any }): T => {
  if (res.error) throw new Error(res.error.message || 'Database request failed');
  return res.data;
};

class DatabaseService {
  private static instance: DatabaseService;
  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) DatabaseService.instance = new DatabaseService();
    return DatabaseService.instance;
  }

  // --- INTERNAL HELPERS ---

  private async sessionUserId(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  private async accessToken(): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || '';
  }

  private async callApi(path: string, body: any): Promise<any> {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.accessToken()}`,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: text };
    }
    if (!response.ok)
      throw new Error(json.error || `Request to ${path} failed (${response.status})`);
    return json;
  }

  /** Record a forensic signal in audit_logs */
  private async logAudit(action: string, targetType: string, targetId: string, metadata: any = {}) {
    if (config.isMockEnabled) {
      console.info(`[AUDIT_LOG] ${action} on ${targetType}:${targetId}`, metadata);
      return;
    }
    try {
      await supabase.from('audit_logs').insert({
        user_id: await this.sessionUserId(),
        action,
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
    } catch (err) {
      console.warn('Audit log failed', err);
    }
  }

  private mockAuctions(): DiscAuction[] {
    return JSON.parse(
      localStorage.getItem('discflip_db_auctions') || JSON.stringify(INITIAL_AUCTIONS)
    );
  }

  private saveMockAuctions(auctions: DiscAuction[]) {
    localStorage.setItem('discflip_db_auctions', JSON.stringify(auctions));
  }

  private async patchMockAuction(auctionId: string, patch: Partial<DiscAuction>) {
    const updated = this.mockAuctions().map((a) => (a.id === auctionId ? { ...a, ...patch } : a));
    this.saveMockAuctions(updated);
  }

  // --- USER METHODS ---

  public async getCurrentUser(): Promise<User | null> {
    if (config.isMockEnabled) return MOCK_USER;
    const uid = await this.sessionUserId();
    return uid ? this.getUserById(uid) : null;
  }

  /** Full profile for yourself, public profile for anyone else. */
  public async getUserById(userId: string): Promise<User | null> {
    if (config.isMockEnabled) {
      return (await this.getUsers()).find((u) => u.id === userId) || null;
    }
    const uid = await this.sessionUserId();
    if (uid === userId) {
      const row = check(await supabase.rpc('get_my_profile'));
      if (!row) return null;
      const user = normalizeUser(fromRow<User>('users', Array.isArray(row) ? row[0] : row));
      user.notifications = await this.getNotifications(userId);
      return user;
    }
    const row = check(
      await supabase
        .from('users')
        .select(PUBLIC_USER_COLUMNS.join(','))
        .eq('id', userId)
        .maybeSingle()
    );
    return row ? normalizeUser(fromRow<User>('users', row as any)) : null;
  }

  public async getUsers(): Promise<User[]> {
    if (config.isMockEnabled) {
      const stored = localStorage.getItem('discflip_db_users');
      return stored ? JSON.parse(stored) : [MOCK_USER, ...OTHER_USERS];
    }
    const rows = check(await supabase.from('users').select(PUBLIC_USER_COLUMNS.join(',')));
    return fromRows<User>('users', rows as any[]).map(normalizeUser);
  }

  public async updateUser(user: User): Promise<void> {
    if (config.isMockEnabled) {
      const users = await this.getUsers();
      const updated = users.map((u) => (u.id === user.id ? user : u));
      localStorage.setItem('discflip_db_users', JSON.stringify(updated));
      return;
    }
    const row = toRow('users', user);
    const patch: Record<string, any> = {};
    SELF_EDITABLE_USER_COLUMNS.forEach((c) => {
      if (c in row) patch[c] = row[c];
    });
    check(await supabase.from('users').update(patch).eq('id', user.id));
  }

  public async searchUsers(query: string, filters: any): Promise<User[]> {
    const all = await this.getUsers();
    const q = query.toLowerCase();
    let results = all.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.handle || '').toLowerCase().includes(q) ||
        (u.pdgaNumber && u.pdgaNumber.includes(query))
    );
    if (filters.role === 'seller') results = results.filter((u) => u.isProSeller);
    if (filters.verifiedOnly) results = results.filter((u) => u.isIdentityVerified);
    if (filters.minRating) results = results.filter((u) => u.rating >= filters.minRating);
    return results;
  }

  public async searchUsersDetailed(query: string): Promise<User[]> {
    return this.searchUsers(query, { role: 'both' });
  }

  public async toggleFavorite(userId: string, targetId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    const favorites = user.favoriteUserIds || [];
    const updatedFavs = favorites.includes(targetId)
      ? favorites.filter((id) => id !== targetId)
      : [...favorites, targetId];
    await this.updateUser({ ...user, favoriteUserIds: updatedFavs });
  }

  // --- MODERATION & SAFETY METHODS ---

  public async getRiskSignals(userId: string): Promise<string[]> {
    const user = await this.getUserById(userId);
    const signals = [];
    if (!user) return [];
    if (user.joinedDate > Date.now() - 30 * 24 * 60 * 60 * 1000) signals.push('new_seller');
    if (!user.isIdentityVerified) signals.push('unverified_identity');
    if (user.strikes > 2) signals.push('high_dispute_rate');
    return signals;
  }

  public async verifyActiveInterest(
    _userId: string,
    _sellerId: string,
    _auctionId: string
  ): Promise<boolean> {
    return true;
  }

  public async getEnforcementStatus(
    userId: string
  ): Promise<{ level: RestrictionLevel; expires?: number }> {
    const user = await this.getUserById(userId);
    if (!user) return { level: RestrictionLevel.None };
    // An expired restriction no longer applies
    if (
      user.restrictionExpires &&
      user.restrictionExpires < Date.now() &&
      user.restrictionLevel !== RestrictionLevel.Banned
    ) {
      return { level: RestrictionLevel.None };
    }
    return {
      level: user.restrictionLevel || RestrictionLevel.None,
      expires: user.restrictionExpires,
    };
  }

  public async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const user = await this.getUserById(blockerId);
    if (!user) return;
    if (!config.isMockEnabled) {
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: blockerId, blocked_id: blockedId });
      if (error && error.code !== '23505') throw new Error(error.message); // 23505 = already blocked
    }
    if (!user.blockedUserIds.includes(blockedId)) {
      await this.updateUser({ ...user, blockedUserIds: [...user.blockedUserIds, blockedId] });
    }
    await this.logAudit('USER_BLOCK', 'USER', blockedId);
  }

  public async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const user = await this.getUserById(blockerId);
    if (!user) return;
    if (!config.isMockEnabled) {
      check(
        await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', blockerId)
          .eq('blocked_id', blockedId)
      );
    }
    await this.updateUser({
      ...user,
      blockedUserIds: user.blockedUserIds.filter((id) => id !== blockedId),
    });
    await this.logAudit('USER_UNBLOCK', 'USER', blockedId);
  }

  public async muteUser(userId: string, targetId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (user) {
      await this.updateUser({ ...user, mutedUserIds: [...(user.mutedUserIds || []), targetId] });
      await this.logAudit('USER_MUTE', 'USER', targetId);
    }
  }

  public async unmuteUser(userId: string, targetId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (user) {
      await this.updateUser({
        ...user,
        mutedUserIds: (user.mutedUserIds || []).filter((id) => id !== targetId),
      });
    }
  }

  public async submitReport(report: Partial<UserReport>): Promise<string> {
    const ticketId = `TKT-${Math.random().toString(36).toUpperCase().substr(2, 6)}`;
    if (config.isMockEnabled) {
      const reports = JSON.parse(localStorage.getItem('discflip_db_reports') || '[]');
      reports.push({
        id: newId(),
        ticketId,
        timestamp: Date.now(),
        internalNotes: [],
        evidencePhotos: [],
        status: ReportStatus.Received,
        severity: ReportSeverity.Medium,
        ...report,
      });
      localStorage.setItem('discflip_db_reports', JSON.stringify(reports));
      return ticketId;
    }
    const uid = await this.sessionUserId();
    const evidencePhotos = await Promise.all(
      (report.evidencePhotos || []).map((p) =>
        storage.uploadIfDataUrl(uid || 'anon', p, 'evidence')
      )
    );
    check(
      await supabase
        .from('reports')
        .insert(toRow('reports', { ...report, evidencePhotos, ticketId, reporterId: uid }))
    );
    await this.logAudit(
      'REPORT_SUBMIT',
      report.targetType || 'UNKNOWN',
      report.targetId || 'UNKNOWN',
      { ticketId }
    );
    return ticketId;
  }

  public async getReports(): Promise<UserReport[]> {
    if (config.isMockEnabled)
      return JSON.parse(localStorage.getItem('discflip_db_reports') || '[]');
    // Only system admins can read reports (row level security); everyone else gets an empty list.
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    return fromRows<UserReport>('reports', data).map((r) => ({
      ...r,
      internalNotes: r.internalNotes || [],
      evidencePhotos: r.evidencePhotos || [],
    }));
  }

  public async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    note: string
  ): Promise<void> {
    if (config.isMockEnabled) {
      const reports = await this.getReports();
      const updated = reports.map((r) => (r.id === reportId ? { ...r, status } : r));
      localStorage.setItem('discflip_db_reports', JSON.stringify(updated));
      return;
    }
    check(await supabase.from('reports').update({ status }).eq('id', reportId));
    await this.logAudit('REPORT_STATUS_UPDATE', 'REPORT', reportId, { status, note });
  }

  public async applyModerationAction(
    userId: string,
    action: string,
    reason: string,
    adminId: string,
    reportId?: string
  ): Promise<void> {
    if (!config.isMockEnabled) {
      check(
        await supabase.rpc('admin_moderate_user', {
          p_user_id: userId,
          p_action: action,
          p_reason: reason,
        })
      );
      await this.logAudit(`MODERATION_${action.toUpperCase()}`, 'USER', userId, {
        reason,
        adminId,
        reportId,
      });
      return;
    }
    const user = (await this.getUsers()).find((u) => u.id === userId);
    if (!user) return;
    user.strikes = (user.strikes || 0) + 1;
    if (action === 'warn') user.restrictionLevel = RestrictionLevel.Warning;
    if (action === 'mute') user.restrictionLevel = RestrictionLevel.RestrictedMessaging;
    if (action === 'freeze') user.restrictionLevel = RestrictionLevel.AccountFreeze;
    if (action === 'ban') user.restrictionLevel = RestrictionLevel.Banned;
    user.restrictionExpires = Date.now() + 3 * 24 * 60 * 60 * 1000;
    await this.updateUser(user);
    await this.logAudit(`MODERATION_${action.toUpperCase()}`, 'USER', userId, {
      reason,
      adminId,
      reportId,
    });
  }

  /** Strike + escalating restriction for an automated safety signal (see securityService). */
  public async issueStrike(userId: string, reason: string): Promise<void> {
    if (!config.isMockEnabled) {
      check(await supabase.rpc('increment_user_strikes', { p_user_id: userId }));
      await this.logAudit('AUTO_STRIKE', 'USER', userId, { reason });
      return;
    }
    const user = (await this.getUsers()).find((u) => u.id === userId);
    if (!user) return;
    const strikes = (user.strikes || 0) + 1;
    let level = user.restrictionLevel;
    if (strikes >= 5) level = RestrictionLevel.Banned;
    else if (strikes >= 3) level = RestrictionLevel.AccountFreeze;
    else if (strikes >= 1) level = RestrictionLevel.Warning;
    await this.updateUser({
      ...user,
      strikes,
      restrictionLevel: level,
      restrictionExpires: Date.now() + 86400000 * strikes,
    });
  }

  public async addInternalNote(
    reportId: string,
    adminId: string,
    adminName: string,
    text: string
  ): Promise<void> {
    const note = { id: newId(), adminId, adminName, text, timestamp: Date.now() };
    if (!config.isMockEnabled) {
      const row = check(
        await supabase.from('reports').select('internal_notes').eq('id', reportId).single()
      );
      const notes = [...((row as any)?.internal_notes || []), note];
      check(await supabase.from('reports').update({ internal_notes: notes }).eq('id', reportId));
      await this.logAudit('CASE_NOTE_ADD', 'REPORT', reportId, { adminId });
      return;
    }
    const reports = await this.getReports();
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      report.internalNotes = [...(report.internalNotes || []), note];
      localStorage.setItem('discflip_db_reports', JSON.stringify(reports));
      await this.logAudit('CASE_NOTE_ADD', 'REPORT', reportId, { adminId });
    }
  }

  public async submitAppeal(
    userId: string,
    userName: string,
    targetType: ReportTargetType,
    targetId: string,
    details: string
  ): Promise<void> {
    await this.submitReport({
      reporterId: userId,
      reporterName: userName,
      targetType,
      targetId,
      details,
      category: ReportCategory.Other,
    });
    await this.logAudit('APPEAL_SUBMIT', 'USER', userId);
  }

  public async markSafetyOnboardingSeen(userId: string): Promise<void> {
    if (!config.isMockEnabled) {
      check(
        await supabase.from('users').update({ has_seen_safety_onboarding: true }).eq('id', userId)
      );
      return;
    }
    const user = await this.getUserById(userId);
    if (user) await this.updateUser({ ...user, hasSeenSafetyOnboarding: true });
  }

  public async acceptLegalTerms(userId: string): Promise<void> {
    if (!config.isMockEnabled) {
      check(
        await supabase
          .from('users')
          .update({ has_accepted_legal_terms: true, legal_accepted_at: Date.now() })
          .eq('id', userId)
      );
      await this.logAudit('LEGAL_ACCEPT', 'USER', userId);
      return;
    }
    const user = await this.getUserById(userId);
    if (user) {
      await this.updateUser({ ...user, hasAcceptedLegalTerms: true, legalAcceptedAt: Date.now() });
      await this.logAudit('LEGAL_ACCEPT', 'USER', userId);
    }
  }

  // --- AUCTION METHODS ---

  public async getAuctions(): Promise<DiscAuction[]> {
    if (config.isMockEnabled) return this.mockAuctions();
    const rows = check(
      await supabase.from('auctions').select('*').order('created_at', { ascending: false })
    );
    return fromRows<DiscAuction>('auctions', rows as any[]).map(normalizeAuction);
  }

  public async saveAuction(auction: Partial<DiscAuction>, _userId?: string): Promise<void> {
    if (config.isMockEnabled) {
      const data = this.mockAuctions();
      const id = newId();
      const now = Date.now();
      data.unshift(
        normalizeAuction({
          ...auction,
          id,
          status: 'active',
          createdAt: now,
          startTime: auction.startTime ?? now,
          endTime: auction.endTime ?? now + (auction.duration || 3) * 86400000,
          currentBid: auction.currentBid ?? auction.startPrice ?? 0,
          bidIncrement: auction.bidIncrement ?? 1,
          bidCount: 0,
          bids: [],
        })
      );
      this.saveMockAuctions(data);
      await this.logAudit('AUCTION_CREATE', 'AUCTION', id);
      return;
    }
    const uid = (await this.sessionUserId()) || 'anon';
    // Photos arrive as data: URLs from the camera/file picker; store them in Supabase Storage first.
    const upload = (src?: string) => storage.uploadIfDataUrl(uid, src, 'listing');
    const [imageUrl, rimImage, profileImage, weightPhoto, ...additionalImages] = await Promise.all([
      upload(auction.imageUrl),
      upload(auction.rimImage),
      upload(auction.profileImage),
      upload(auction.weightPhoto),
      ...(auction.additionalImages || []).map(upload),
    ]);
    const prepared: Partial<DiscAuction> = {
      ...auction,
      imageUrl: imageUrl || 'https://picsum.photos/seed/discflip/600/600',
      rimImage,
      profileImage,
      weightPhoto,
      additionalImages: additionalImages.filter(Boolean) as string[],
    };
    const created = await this.callApi('/api/auctions/create', {
      auctionData: toRow('auctions', prepared),
    });
    await this.logAudit('AUCTION_CREATE', 'AUCTION', created?.id || 'unknown');
  }

  public async hideAuction(auctionId: string): Promise<void> {
    if (config.isMockEnabled) {
      await this.patchMockAuction(auctionId, { isHidden: true });
    } else {
      check(await supabase.from('auctions').update({ is_hidden: true }).eq('id', auctionId));
    }
    await this.logAudit('AUCTION_HIDE', 'AUCTION', auctionId);
  }

  public async adminTakedownListing(
    auctionId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    await this.hideAuction(auctionId);
    await this.logAudit('AUCTION_TAKEDOWN', 'AUCTION', auctionId, { adminId, reason });
  }

  /** Close auctions whose timer ran out. Winners get a "pay now" order in their account. */
  public async processAuctionEndings(): Promise<void> {
    if (!config.isMockEnabled) {
      const { error } = await supabase.rpc('finalize_ended_auctions');
      if (error) console.warn('finalize_ended_auctions failed:', error.message);
      return;
    }
    const auctions = this.mockAuctions();
    const now = Date.now();
    let changed = false;
    const updated = auctions.map((a) => {
      if (a.status === 'active' && a.endTime < now) {
        changed = true;
        if (a.bidCount > 0) {
          return {
            ...a,
            status: 'sold',
            buyerId: a.highBidderId,
            soldPrice: a.currentBid,
            soldAt: now,
            payoutStatus: 'unpaid' as const,
          };
        }
        return { ...a, status: 'expired' };
      }
      return a;
    });
    if (changed) this.saveMockAuctions(updated);
  }

  /** Real numbers from this seller's order history. */
  public async calculateSellerPerformance(userId: string): Promise<SellerPerformance> {
    const sales = (await this.getAuctions()).filter((a) => a.sellerId === userId && a.buyerId);
    const shipped = sales.filter(
      (a) => a.trackingNumber || (a.trackingEvents && a.trackingEvents.length > 0)
    );
    const shipTimes = shipped
      .map((a) => {
        const firstScan = Math.min(...(a.trackingEvents || []).map((e) => e.timestamp));
        return a.soldAt && Number.isFinite(firstScan) ? firstScan - a.soldAt : null;
      })
      .filter((t): t is number => t !== null && t >= 0);
    const avgShipTimeMs = shipTimes.length
      ? shipTimes.reduce((s, t) => s + t, 0) / shipTimes.length
      : 0;
    const late = sales.filter(
      (a) => a.shipByDate && !a.trackingNumber && a.shipByDate < Date.now()
    ).length;
    const trackingComplianceRate = sales.length
      ? Math.round((shipped.length / sales.length) * 100)
      : 100;
    const lateShipmentRate = sales.length ? Math.round((late / sales.length) * 100) : 0;
    const badges: string[] = [];
    if (shipTimes.length && avgShipTimeMs < 24 * 3600000) badges.push('Fast Shipper');
    if (sales.length >= 5 && trackingComplianceRate >= 95) badges.push('Tracking Always');
    return {
      avgShipTimeMs,
      trackingComplianceRate,
      lateShipmentRate,
      totalShipments: shipped.length,
      badges,
    };
  }

  public async placeBid(auctionId: string, bidderId: string, amount: number): Promise<void> {
    if (config.isMockEnabled) {
      const auctions = this.mockAuctions();
      const auction = auctions.find((a) => a.id === auctionId);
      if (auction) {
        const minimum =
          auction.bidCount > 0
            ? auction.currentBid + (auction.bidIncrement || 1)
            : auction.startPrice || 0;
        if (amount < minimum) throw new Error(`Bid must be at least $${minimum.toFixed(2)}`);
        auction.currentBid = amount;
        auction.bidCount = (auction.bidCount || 0) + 1;
        auction.highBidderId = bidderId;
        auction.bids = [
          ...(auction.bids || []),
          { id: newId(), bidder: bidderId, bidderId, amount, timestamp: Date.now() },
        ];
        this.saveMockAuctions(auctions);
        await this.logAudit('BID_PLACE', 'AUCTION', auctionId, { amount, bidderId });
      }
      return;
    }
    // The database function checks: auction is live, you aren't the seller, nobody is blocked,
    // and the bid beats the current price by the increment. It also handles anti-snipe.
    const { error } = await supabase.rpc('place_bid_secure', {
      p_auction_id: auctionId,
      p_amount: amount,
    });
    if (error) throw new Error(error.message);
    await this.logAudit('BID_PLACE', 'AUCTION', auctionId, { amount, bidderId });
  }

  // --- ORDER & FULFILLMENT METHODS ---

  /** Mock mode only: simulate a completed purchase. In live mode Stripe's webhook marks orders paid. */
  public async executeCheckout(userId: string, items: any[], total: number): Promise<void> {
    if (!config.isMockEnabled) return;
    const user = (await this.getUsers()).find((u) => u.id === userId);
    if (user) await this.updateUser({ ...user, balance: user.balance - total });
    const ids = items.map((i) => i.auctionId);
    const updated = this.mockAuctions().map((a) =>
      ids.includes(a.id)
        ? {
            ...a,
            status: 'sold',
            buyerId: userId,
            soldPrice: a.soldPrice || a.buyNowPrice || a.currentBid,
            soldAt: Date.now(),
            payoutStatus: 'pending' as const,
            fulfillmentMode:
              items.find((i) => i.auctionId === a.id)?.fulfillment === 'pickup'
                ? ('pickup' as const)
                : ('shipping' as const),
          }
        : a
    );
    this.saveMockAuctions(updated);
    await this.logAudit('CHECKOUT_EXECUTE', 'ORDER_BATCH', userId, {
      total,
      itemCount: items.length,
    });
  }

  public async markAsPacked(auctionId: string, proofPhoto: string): Promise<void> {
    if (config.isMockEnabled) {
      await this.patchMockAuction(auctionId, { status: 'packed', packagingProofPhoto: proofPhoto });
    } else {
      const uid = (await this.sessionUserId()) || 'anon';
      const photo = await storage.uploadIfDataUrl(uid, proofPhoto, 'packing');
      check(
        await supabase.rpc('mark_order_packed', {
          p_auction_id: auctionId,
          p_proof_photo: photo || null,
        })
      );
    }
    await this.logAudit('ORDER_PACKED', 'AUCTION', auctionId);
  }

  /** Buyer confirms the disc arrived as described; the seller's payout is then released. */
  public async confirmDelivery(auctionId: string, rating: number): Promise<void> {
    if (config.isMockEnabled) {
      await this.patchMockAuction(auctionId, { status: 'completed' });
    } else {
      check(
        await supabase.rpc('confirm_order_delivery', { p_auction_id: auctionId, p_rating: rating })
      );
      try {
        await this.callApi('/api/payments/release-escrow', { auctionId });
      } catch (err) {
        // The order is complete either way; an admin can retry the payout from the Admin Hub.
        console.warn('Escrow release did not run:', err);
      }
    }
    await this.logAudit('ORDER_CONFIRMED', 'AUCTION', auctionId, { rating });
  }

  /** Buyer picks a meetup spot and time for a local-pickup order. */
  public async schedulePickup(auctionId: string, details: Partial<PickupDetails>): Promise<void> {
    if (config.isMockEnabled) {
      const pin = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      await this.patchMockAuction(auctionId, {
        status: 'pickup_scheduled',
        fulfillmentMode: 'pickup',
        pickupDetails: {
          location: '',
          timeWindow: '',
          shareLocation: false,
          ...details,
          verificationPin: pin,
        },
      });
    } else {
      check(await supabase.rpc('schedule_pickup', { p_auction_id: auctionId, p_details: details }));
    }
    await this.logAudit('PICKUP_SCHEDULED', 'AUCTION', auctionId);
  }

  /** Buyer enters the seller's PIN at the meetup. Returns false if the PIN is wrong. */
  public async completePickup(auctionId: string, pin: string): Promise<boolean> {
    if (config.isMockEnabled) {
      const a = this.mockAuctions().find((x) => x.id === auctionId);
      if (!a || a.pickupDetails?.verificationPin !== pin) return false;
      await this.patchMockAuction(auctionId, { status: 'completed' });
    } else {
      const ok = check(
        await supabase.rpc('complete_pickup', { p_auction_id: auctionId, p_pin: pin })
      );
      if (!ok) return false;
      try {
        await this.callApi('/api/payments/release-escrow', { auctionId });
      } catch (err) {
        console.warn('Escrow release did not run:', err);
      }
    }
    await this.logAudit('PICKUP_COMPLETED', 'AUCTION', auctionId);
    return true;
  }

  public async reportOrderIssue(auctionId: string, dispute: OrderDispute): Promise<void> {
    if (config.isMockEnabled) {
      await this.patchMockAuction(auctionId, { status: 'disputed' });
    } else {
      check(
        await supabase.rpc('open_order_dispute', { p_auction_id: auctionId, p_dispute: dispute })
      );
    }
    await this.submitReport({
      targetType: ReportTargetType.Order,
      targetId: auctionId,
      category: ReportCategory.Misrepresentation,
      details: dispute.details,
      evidencePhotos: dispute.evidencePhotos,
    });
    await this.logAudit('ORDER_DISPUTE_OPEN', 'AUCTION', auctionId, { reason: dispute.reason });
  }

  public async syncTrackingEvents(auctionId: string): Promise<TrackingEvent[]> {
    if (config.isMockEnabled) {
      return [
        {
          id: '1',
          timestamp: Date.now(),
          location: 'Local Hub',
          message: 'In Transit',
          type: 'transit',
        },
      ];
    }
    const row = check(
      await supabase.from('auctions').select('tracking_events').eq('id', auctionId).maybeSingle()
    );
    return ((row as any)?.tracking_events || []) as TrackingEvent[];
  }

  public getCarrierDeepLink(carrier: string, tracking: string): string {
    const c = (carrier || '').toUpperCase();
    if (c === 'USPS')
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`;
    if (c === 'UPS') return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
    if (c === 'FEDEX')
      return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`;
    return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} ${tracking}`)}`;
  }

  public async withdrawFunds(userId: string, amount: number, bankId: string): Promise<void> {
    if (!config.isMockEnabled) {
      throw new Error(
        'Payouts go straight to your connected Stripe account once the buyer confirms delivery. Manage your bank account from the Stripe dashboard.'
      );
    }
    const user = (await this.getUsers()).find((u) => u.id === userId);
    if (user) {
      await this.updateUser({ ...user, payoutBalance: user.payoutBalance - amount });
      await this.logAudit('FUNDS_WITHDRAW', 'USER', userId, { amount, bankId });
    }
  }

  // --- ADMIN CORE METHODS ---

  public async getInfraHealth(): Promise<InfraHealth> {
    if (config.isMockEnabled) {
      return {
        webhooks: 'Operational',
        queueBacklog: 12,
        errorRate: 0.05,
        apiLatency: '45ms',
        dbConnections: 84,
        lastPaymentSync: Date.now(),
      };
    }
    // Measured live: API round trip, database round trip, orders waiting to ship,
    // dispute rate, and the last time Stripe's webhook confirmed a payment.
    let apiLatency = 'offline';
    let webhooksOk = true;
    try {
      const t0 = performance.now();
      const res = await fetch(`${config.apiBaseUrl}/api/health`);
      apiLatency = res.ok ? `${Math.round(performance.now() - t0)}ms` : `error ${res.status}`;
      webhooksOk = res.ok;
    } catch {
      webhooksOk = false;
    }

    const t1 = performance.now();
    const auctions = await this.getAuctions();
    const dbMs = Math.round(performance.now() - t1);
    const orders = auctions.filter((a) => a.buyerId);
    const backlog = orders.filter((a) => ['sold', 'packed'].includes(a.status)).length;
    const disputed = orders.filter((a) => a.status === 'disputed').length;
    const { data: lastPay } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('action', 'PAYMENT_COMPLETE')
      .order('created_at', { ascending: false })
      .limit(1);
    return {
      webhooks: webhooksOk ? 'Operational' : 'Critical',
      queueBacklog: backlog,
      errorRate: orders.length ? (disputed / orders.length) * 100 : 0,
      apiLatency,
      dbConnections: dbMs,
      lastPaymentSync: lastPay?.[0]?.created_at ? new Date(lastPay[0].created_at).getTime() : 0,
    };
  }

  public async adminGetThreadForOrder(orderId: string): Promise<Thread | null> {
    if (!config.isMockEnabled) {
      const { data } = await supabase.from('threads').select('*').eq('object_id', orderId).limit(1);
      return data?.[0] ? fromRow<Thread>('threads', data[0]) : null;
    }
    const threads = await this.getThreads('admin');
    return threads.find((t) => t.objectId === orderId) || null;
  }

  public async adminForceRefund(orderId: string, adminId: string, reason: string): Promise<void> {
    if (!config.isMockEnabled) {
      await this.callApi('/api/payments/refund', { auctionId: orderId, reason });
    } else {
      await this.patchMockAuction(orderId, { status: 'refunded', payoutStatus: 'refunded' });
    }
    await this.logAudit('ADMIN_FORCE_REFUND', 'AUCTION', orderId, { adminId, reason });
  }

  public async adminForceClose(orderId: string, adminId: string, reason: string): Promise<void> {
    if (!config.isMockEnabled) {
      check(
        await supabase.rpc('admin_set_order_status', {
          p_auction_id: orderId,
          p_status: 'completed',
          p_extend_hours: 0,
        })
      );
      try {
        await this.callApi('/api/payments/release-escrow', { auctionId: orderId });
      } catch (err) {
        console.warn(err);
      }
    } else {
      await this.confirmDelivery(orderId, 5);
    }
    await this.logAudit('ADMIN_FORCE_CLOSE', 'AUCTION', orderId, { adminId, reason });
  }

  public async adminExtendWindow(orderId: string, adminId: string, hours: number): Promise<void> {
    if (!config.isMockEnabled) {
      check(
        await supabase.rpc('admin_set_order_status', {
          p_auction_id: orderId,
          p_status: null,
          p_extend_hours: hours,
        })
      );
    } else {
      const a = this.mockAuctions().find((x) => x.id === orderId);
      await this.patchMockAuction(orderId, {
        confirmationDeadline: (a?.confirmationDeadline || Date.now()) + hours * 3600000,
      });
    }
    await this.logAudit('ADMIN_EXTEND_WINDOW', 'AUCTION', orderId, { adminId, hours });
  }

  // --- MESSAGING & THREAD METHODS ---

  public async getThreads(userId: string): Promise<Thread[]> {
    if (config.isMockEnabled)
      return JSON.parse(localStorage.getItem(`discflip_db_threads_${userId}`) || '[]');
    const rows = check(
      await supabase
        .from('threads')
        .select('*')
        .contains('participant_ids', [userId])
        .order('last_timestamp', { ascending: false })
    );
    return fromRows<Thread>('threads', rows as any[]).map((t) => ({
      ...t,
      unreadCount: t.unreadCount || {},
    }));
  }

  public async createOrGetThread(params: any): Promise<string> {
    if (!config.isMockEnabled) {
      const { data: existing } = await supabase
        .from('threads')
        .select('id')
        .eq('object_id', params.objectId)
        .eq('buyer_id', params.buyerId)
        .eq('seller_id', params.sellerId)
        .limit(1);
      if (existing?.[0]) return existing[0].id;
      const row = check(
        await supabase
          .from('threads')
          .insert(
            toRow('threads', {
              ...params,
              participantIds: [params.buyerId, params.sellerId],
              unreadCount: {},
              lastTimestamp: Date.now(),
              status: 'open',
            })
          )
          .select('id')
          .single()
      );
      return (row as any).id;
    }
    const threads = await this.getThreads(params.buyerId);
    const existing = threads.find(
      (t) => t.objectId === params.objectId && t.sellerId === params.sellerId
    );
    if (existing) return existing.id;
    const id = newId();
    const thread = {
      id,
      ...params,
      participantIds: [params.buyerId, params.sellerId],
      unreadCount: {},
      lastTimestamp: Date.now(),
      status: 'open',
    };
    for (const uid of [params.buyerId, params.sellerId]) {
      const list = await this.getThreads(uid);
      list.push(thread);
      localStorage.setItem(`discflip_db_threads_${uid}`, JSON.stringify(list));
    }
    return id;
  }

  public async markThreadAsRead(threadId: string, userId: string): Promise<void> {
    if (!config.isMockEnabled) {
      await supabase.rpc('mark_thread_read', { p_thread_id: threadId });
      return;
    }
    const threads = await this.getThreads(userId);
    const updated = threads.map((t) =>
      t.id === threadId ? { ...t, unreadCount: { ...t.unreadCount, [userId]: 0 } } : t
    );
    localStorage.setItem(`discflip_db_threads_${userId}`, JSON.stringify(updated));
  }

  public async getMessages(threadId: string, _userId: string): Promise<Message[]> {
    if (config.isMockEnabled)
      return JSON.parse(localStorage.getItem(`discflip_db_msgs_${threadId}`) || '[]');
    const rows = check(
      await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true })
    );
    return fromRows<Message>('messages', rows as any[]);
  }

  public async sendMessage(
    threadId: string,
    senderId: string,
    text: string,
    metadata?: any
  ): Promise<void> {
    if (config.isMockEnabled) {
      const msgs = await this.getMessages(threadId, senderId);
      msgs.push({ id: newId(), senderId, text, timestamp: Date.now(), isRead: false, ...metadata });
      localStorage.setItem(`discflip_db_msgs_${threadId}`, JSON.stringify(msgs));
      return;
    }
    // Goes through the API so the server can scan for scams and mask phone numbers/emails.
    await this.callApi('/api/messages/send', { threadId, text, ...metadata });
  }

  // --- BOUNTY & TRADE METHODS ---

  public async getBounties(): Promise<Bounty[]> {
    if (config.isMockEnabled)
      return JSON.parse(localStorage.getItem('discflip_db_bounties') || '[]');
    const rows = check(
      await supabase
        .from('bounties')
        .select('*, bounty_submissions(*)')
        .order('created_at', { ascending: false })
    );
    return (rows as any[]).map((r) => ({
      ...fromRow<Bounty>('bounties', r),
      submissions: fromRows<BountySubmission>('bounty_submissions', r.bounty_submissions),
    }));
  }

  public async saveBounty(bounty: Partial<Bounty>): Promise<void> {
    if (!config.isMockEnabled) {
      const uid = await this.sessionUserId();
      const row = check(
        await supabase
          .from('bounties')
          .insert(
            toRow('bounties', {
              status: 'Open',
              viewCount: 0,
              expirationDate: Date.now() + 7 * 86400000,
              ...bounty,
              buyerId: uid,
            })
          )
          .select('id')
          .single()
      );
      await this.logAudit('BOUNTY_CREATE', 'BOUNTY', (row as any).id);
      return;
    }
    const list = await this.getBounties();
    const id = newId();
    list.push({
      id,
      createdAt: Date.now(),
      status: 'Open' as any,
      submissions: [],
      viewCount: 0,
      expirationDate: Date.now() + 7 * 86400000,
      ...bounty,
    } as any);
    localStorage.setItem('discflip_db_bounties', JSON.stringify(list));
    await this.logAudit('BOUNTY_CREATE', 'BOUNTY', id);
  }

  public async submitBountyMatch(submission: Partial<BountySubmission>): Promise<void> {
    if (!config.isMockEnabled) {
      const uid = (await this.sessionUserId()) || 'anon';
      const imageUrl = await storage.uploadIfDataUrl(uid, submission.imageUrl, 'bounty');
      check(
        await supabase
          .from('bounty_submissions')
          .insert(toRow('bounty_submissions', { ...submission, imageUrl, sellerId: uid }))
      );
      await this.logAudit('BOUNTY_SUBMIT', 'BOUNTY', submission.bountyId!);
      return;
    }
    const bounties = await this.getBounties();
    const bounty = bounties.find((b) => b.id === submission.bountyId);
    if (bounty) {
      bounty.submissions.push({ id: newId(), timestamp: Date.now(), ...submission } as any);
      localStorage.setItem('discflip_db_bounties', JSON.stringify(bounties));
      await this.logAudit('BOUNTY_SUBMIT', 'BOUNTY', submission.bountyId!);
    }
  }

  /** Bounty poster accepts a match: creates an order they then pay for from Account → Orders. */
  public async acceptBountySubmission(bounty: Bounty, submissionId: string): Promise<string> {
    if (!config.isMockEnabled) {
      const orderId = check(
        await supabase.rpc('accept_bounty_submission', { p_submission_id: submissionId })
      );
      await this.logAudit('BOUNTY_ACCEPT', 'BOUNTY', bounty.id, { submissionId });
      return String(orderId);
    }
    const sub = bounty.submissions.find((x) => x.id === submissionId);
    if (!sub) throw new Error('Submission not found');
    if (bounty.status !== BountyStatus.Open) throw new Error('This bounty is already closed');
    const orderId = newId();
    const now = Date.now();
    const order = normalizeAuction({
      id: orderId,
      sellerId: sub.sellerId,
      seller: sub.sellerName,
      title: `${bounty.brand} ${bounty.plastic} ${bounty.mold}`.trim(),
      brand: bounty.brand,
      mold: bounty.mold,
      plastic: bounty.plastic,
      condition: sub.condition,
      hasInk: sub.hasInk,
      description: sub.notes,
      imageUrl: sub.imageUrl,
      type: AuctionType.BuyItNow,
      startPrice: sub.priceProposed,
      currentBid: sub.priceProposed,
      status: 'sold',
      buyerId: bounty.buyerId,
      soldPrice: sub.priceProposed,
      soldAt: now,
      payoutStatus: 'unpaid',
      isHidden: true,
      endTime: now,
      createdAt: now,
    });
    this.saveMockAuctions([order, ...this.mockAuctions()]);
    const bounties = (await this.getBounties()).map((b) =>
      b.id === bounty.id ? { ...b, status: BountyStatus.Fulfilled } : b
    );
    localStorage.setItem('discflip_db_bounties', JSON.stringify(bounties));
    await this.logAudit('BOUNTY_ACCEPT', 'BOUNTY', bounty.id, { submissionId });
    return orderId;
  }

  public async getTrades(): Promise<TradeOffer[]> {
    if (config.isMockEnabled) return JSON.parse(localStorage.getItem('discflip_db_trades') || '[]');
    // Row level security only returns trades you sent or received
    const rows = check(
      await supabase.from('trade_offers').select('*').order('created_at', { ascending: false })
    );
    return fromRows<TradeOffer>('trade_offers', rows as any[]);
  }

  public async createTradeOffer(offer: Partial<TradeOffer>): Promise<void> {
    if (!config.isMockEnabled) {
      const uid = await this.sessionUserId();
      const row = check(
        await supabase
          .from('trade_offers')
          .insert(toRow('trade_offers', { ...offer, senderId: uid, status: TradeStatus.Pending }))
          .select('id')
          .single()
      );
      await this.logAudit('TRADE_OFFER_CREATE', 'TRADE', (row as any).id);
      return;
    }
    const list = await this.getTrades();
    const id = newId();
    list.push({ id, timestamp: Date.now(), status: TradeStatus.Pending, ...offer } as any);
    localStorage.setItem('discflip_db_trades', JSON.stringify(list));
    await this.logAudit('TRADE_OFFER_CREATE', 'TRADE', id);
  }

  /** Receiver accepts or declines; either side can mark an accepted trade completed. */
  public async respondToTrade(tradeId: string, status: TradeStatus): Promise<void> {
    if (!config.isMockEnabled) {
      check(await supabase.rpc('respond_to_trade', { p_trade_id: tradeId, p_status: status }));
    } else {
      const list = (await this.getTrades()).map((t) => (t.id === tradeId ? { ...t, status } : t));
      localStorage.setItem('discflip_db_trades', JSON.stringify(list));
    }
    await this.logAudit(`TRADE_${status.toUpperCase()}`, 'TRADE', tradeId);
  }

  // --- CLUB METHODS ---

  private mockClubs(): DiscClub[] {
    return JSON.parse(localStorage.getItem('discflip_db_clubs') || JSON.stringify(CLUBS));
  }

  public async getClubs(): Promise<DiscClub[]> {
    if (config.isMockEnabled) return this.mockClubs();
    const rows = check(
      await supabase.from('clubs').select('*').order('member_count', { ascending: false })
    );
    return fromRows<DiscClub>('clubs', rows as any[]).map((c) => ({
      ...c,
      memberIds: c.memberIds || [],
      pendingMemberIds: c.pendingMemberIds || [],
      bannedMemberIds: c.bannedMemberIds || [],
    }));
  }

  public async createClub(adminId: string, clubData: Partial<DiscClub>): Promise<string> {
    if (!config.isMockEnabled) {
      const logo = await storage.uploadIfDataUrl(adminId, clubData.logo, 'club');
      const id = check(
        await supabase.rpc('create_club', { p_club: toRow('clubs', { ...clubData, logo }) })
      );
      await this.logAudit('CLUB_CREATE', 'CLUB', String(id));
      return String(id);
    }
    const clubs = this.mockClubs();
    const id = newId();
    clubs.push({
      id,
      adminId,
      memberCount: 1,
      memberIds: [adminId],
      pendingMemberIds: [],
      bannedMemberIds: [],
      rating: 5,
      isVerified: false,
      ...clubData,
    } as any);
    localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
    await this.logAudit('CLUB_CREATE', 'CLUB', id);
    return id;
  }

  private async clubAction(
    fn: string,
    clubId: string,
    userId: string,
    mockMutate: (c: DiscClub) => boolean,
    audit?: string
  ) {
    if (!config.isMockEnabled) {
      check(await supabase.rpc(fn, { p_club_id: clubId, p_user_id: userId }));
    } else {
      const clubs = this.mockClubs();
      const club = clubs.find((c) => c.id === clubId);
      if (!club || !mockMutate(club)) return;
      localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
    }
    if (audit) await this.logAudit(audit, 'CLUB', clubId, { userId });
  }

  public async requestToJoinClub(clubId: string, userId: string): Promise<void> {
    await this.clubAction(
      'request_to_join_club',
      clubId,
      userId,
      (club) => {
        if (club.bannedMemberIds.includes(userId))
          throw new Error('You are not able to join this club.');
        if (club.pendingMemberIds.includes(userId) || club.memberIds.includes(userId)) return false;
        club.pendingMemberIds.push(userId);
        return true;
      },
      'CLUB_JOIN_REQUEST'
    );
  }

  public async approveMember(clubId: string, userId: string, adminId: string): Promise<void> {
    await this.clubAction(
      'approve_club_member',
      clubId,
      userId,
      (club) => {
        if (club.adminId !== adminId) return false;
        club.pendingMemberIds = club.pendingMemberIds.filter((id) => id !== userId);
        if (!club.memberIds.includes(userId)) {
          club.memberIds.push(userId);
          club.memberCount++;
        }
        return true;
      },
      'CLUB_MEMBER_APPROVE'
    );
  }

  public async removeMemberFromClub(
    clubId: string,
    userId: string,
    adminId: string
  ): Promise<void> {
    await this.clubAction(
      'remove_club_member',
      clubId,
      userId,
      (club) => {
        if (club.adminId !== adminId) return false;
        club.memberIds = club.memberIds.filter((id) => id !== userId);
        club.memberCount = Math.max(0, club.memberCount - 1);
        return true;
      },
      'CLUB_MEMBER_REMOVE'
    );
  }

  public async banMemberFromClub(clubId: string, userId: string, adminId: string): Promise<void> {
    await this.clubAction(
      'ban_club_member',
      clubId,
      userId,
      (club) => {
        if (club.adminId !== adminId) return false;
        club.memberIds = club.memberIds.filter((id) => id !== userId);
        club.pendingMemberIds = club.pendingMemberIds.filter((id) => id !== userId);
        club.bannedMemberIds.push(userId);
        club.memberCount = club.memberIds.length;
        return true;
      },
      'CLUB_MEMBER_BAN'
    );
  }

  // --- NOTIFICATION METHODS ---

  private async getNotifications(userId: string): Promise<AppNotification[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    return fromRows<AppNotification>('notifications', data);
  }

  public async pushNotification(
    userId: string,
    notification: Partial<AppNotification>
  ): Promise<void> {
    if (!config.isMockEnabled) {
      const { error } = await supabase
        .from('notifications')
        .insert(toRow('notifications', { ...notification, userId, isRead: false }));
      if (error) console.warn('Notification not saved:', error.message);
      return;
    }
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.notifications = [
        ...(user.notifications || []),
        { id: newId(), timestamp: Date.now(), isRead: false, ...notification } as AppNotification,
      ];
      await this.updateUser(user);
    }
  }

  public async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    if (!config.isMockEnabled) {
      check(
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', userId)
      );
      return;
    }
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.notifications = (user.notifications || []).map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      await this.updateUser(user);
    }
  }
}

export const db = DatabaseService.getInstance();
