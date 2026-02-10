
import { config } from './config';
import { supabase } from './supabaseClient';
import { 
    DiscAuction, Message, UserReport, ReportStatus, User, SellerPerformance, 
    TradeOffer, DiscClub, Bounty, AppNotification, InfraHealth, Thread, 
    TrackingEvent, OrderDispute, RestrictionLevel, ReportTargetType, BountySubmission,
    ReportCategory
} from '../types';
import { MOCK_USER, OTHER_USERS, INITIAL_AUCTIONS } from '../constants';

class DatabaseService {
  private static instance: DatabaseService;
  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) DatabaseService.instance = new DatabaseService();
    return DatabaseService.instance;
  }

  /**
   * Internal helper to record forensic signals
   */
  private async logAudit(action: string, targetType: string, targetId: string, metadata: any = {}) {
    if (config.isMockEnabled) {
        console.info(`[AUDIT_LOG] ${action} on ${targetType}:${targetId}`, metadata);
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('audit_logs').insert({
        user_id: session?.user?.id,
        action,
        target_type: targetType,
        target_id: targetId,
        metadata,
        created_at: new Date().toISOString()
    });
  }

  // --- USER METHODS ---

  public async getCurrentUser(): Promise<User | null> {
    if (config.isMockEnabled) return MOCK_USER;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
    return data;
  }

  public async getUsers(): Promise<User[]> {
    if (config.isMockEnabled) {
        const stored = localStorage.getItem('discflip_db_users');
        return stored ? JSON.parse(stored) : [MOCK_USER, ...OTHER_USERS];
    }
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  }

  public async updateUser(user: User): Promise<void> {
    if (config.isMockEnabled) {
        const users = await this.getUsers();
        const updated = users.map(u => u.id === user.id ? user : u);
        localStorage.setItem('discflip_db_users', JSON.stringify(updated));
        return;
    }
    const { error } = await supabase.from('users').update(user).eq('id', user.id);
    if (error) throw error;
  }

  public async searchUsers(query: string, filters: any): Promise<User[]> {
    const all = await this.getUsers();
    let results = all.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) || 
        u.handle.toLowerCase().includes(query.toLowerCase()) ||
        (u.pdgaNumber && u.pdgaNumber.includes(query))
    );
    if (filters.role === 'seller') results = results.filter(u => u.isProSeller);
    if (filters.verifiedOnly) results = results.filter(u => u.isIdentityVerified);
    if (filters.minRating) results = results.filter(u => u.rating >= filters.minRating);
    return results;
  }

  public async searchUsersDetailed(query: string): Promise<User[]> {
    return this.searchUsers(query, { role: 'both' });
  }

  public async toggleFavorite(userId: string, targetId: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (!user) return;
    const favorites = user.favoriteUserIds || [];
    const updatedFavs = favorites.includes(targetId) 
        ? favorites.filter(id => id !== targetId) 
        : [...favorites, targetId];
    await this.updateUser({ ...user, favoriteUserIds: updatedFavs });
  }

  // --- MODERATION & SAFETY METHODS ---

  public async getRiskSignals(userId: string): Promise<string[]> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    const signals = [];
    if (!user) return [];
    if (user.joinedDate > Date.now() - (30 * 24 * 60 * 60 * 1000)) signals.push('new_seller');
    if (!user.isIdentityVerified) signals.push('unverified_identity');
    if (user.strikes > 2) signals.push('high_dispute_rate');
    return signals;
  }

  public async verifyActiveInterest(userId: string, sellerId: string, auctionId: string): Promise<boolean> {
    return true; 
  }

  public async getEnforcementStatus(userId: string): Promise<{ level: RestrictionLevel, expires?: number }> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (!user) return { level: RestrictionLevel.None };
    return { level: user.restrictionLevel, expires: user.restrictionExpires };
  }

  public async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (config.isMockEnabled) {
        const users = await this.getUsers();
        const user = users.find(u => u.id === blockerId);
        if (user) {
            user.blockedUserIds = [...(user.blockedUserIds || []), blockedId];
            await this.updateUser(user);
        }
        return;
    }
    const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) throw error;
    await this.logAudit('USER_BLOCK', 'USER', blockedId);
  }

  public async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    if (config.isMockEnabled) {
        const users = await this.getUsers();
        const user = users.find(u => u.id === blockerId);
        if (user) {
            user.blockedUserIds = (user.blockedUserIds || []).filter(id => id !== blockedId);
            await this.updateUser(user);
        }
        return;
    }
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
    if (error) throw error;
    await this.logAudit('USER_UNBLOCK', 'USER', blockedId);
  }

  public async muteUser(userId: string, targetId: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (user) {
        user.mutedUserIds = [...(user.mutedUserIds || []), targetId];
        await this.updateUser(user);
        await this.logAudit('USER_MUTE', 'USER', targetId);
    }
  }

  public async unmuteUser(userId: string, targetId: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (user) {
        user.mutedUserIds = (user.mutedUserIds || []).filter(id => id !== targetId);
        await this.updateUser(user);
    }
  }

  public async submitReport(report: Partial<UserReport>): Promise<string> {
    const ticketId = `TKT-${Math.random().toString(36).toUpperCase().substr(2, 6)}`;
    if (config.isMockEnabled) {
        const reports = JSON.parse(localStorage.getItem('discflip_db_reports') || '[]');
        reports.push({ id: Math.random().toString(36).substr(2, 9), ticketId, timestamp: Date.now(), internalNotes: [], ...report });
        localStorage.setItem('discflip_db_reports', JSON.stringify(reports));
        return ticketId;
    }
    const { error } = await supabase.from('reports').insert({ ...report, ticket_id: ticketId, created_at: new Date().toISOString() });
    if (error) throw error;
    await this.logAudit('REPORT_SUBMIT', report.targetType || 'UNKNOWN', report.targetId || 'UNKNOWN', { ticketId });
    return ticketId;
  }

  public async getReports(): Promise<UserReport[]> {
    if (config.isMockEnabled) return JSON.parse(localStorage.getItem('discflip_db_reports') || '[]');
    const { data } = await supabase.from('reports').select('*');
    return data || [];
  }

  public async updateReportStatus(reportId: string, status: ReportStatus, note: string): Promise<void> {
    if (config.isMockEnabled) {
        const reports = await this.getReports();
        const updated = reports.map(r => r.id === reportId ? { ...r, status } : r);
        localStorage.setItem('discflip_db_reports', JSON.stringify(updated));
        return;
    }
    await supabase.from('reports').update({ status }).eq('id', reportId);
    await this.logAudit('REPORT_STATUS_UPDATE', 'REPORT', reportId, { status, note });
  }

  public async applyModerationAction(userId: string, action: string, reason: string, adminId: string, reportId?: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (!user) return;
    user.strikes = (user.strikes || 0) + 1;
    if (action === 'warn') user.restrictionLevel = RestrictionLevel.Warning;
    if (action === 'mute') user.restrictionLevel = RestrictionLevel.RestrictedMessaging;
    if (action === 'freeze') user.restrictionLevel = RestrictionLevel.AccountFreeze;
    if (action === 'ban') user.restrictionLevel = RestrictionLevel.Banned;
    user.restrictionExpires = Date.now() + (3 * 24 * 60 * 60 * 1000);
    await this.updateUser(user);
    await this.logAudit(`MODERATION_${action.toUpperCase()}`, 'USER', userId, { reason, adminId, reportId });
  }

  public async addInternalNote(reportId: string, adminId: string, adminName: string, text: string): Promise<void> {
    const reports = await this.getReports();
    const report = reports.find(r => r.id === reportId);
    if (report) {
        report.internalNotes.push({ id: Math.random().toString(36).substr(2, 9), adminId, adminName, text, timestamp: Date.now() });
        localStorage.setItem('discflip_db_reports', JSON.stringify(reports));
        await this.logAudit('CASE_NOTE_ADD', 'REPORT', reportId, { adminId });
    }
  }

  public async submitAppeal(userId: string, userName: string, targetType: ReportTargetType, targetId: string, details: string): Promise<void> {
    await this.submitReport({ reporterId: userId, reporterName: userName, targetType, targetId, details, category: ReportCategory.Other });
    await this.logAudit('APPEAL_SUBMIT', 'USER', userId);
  }

  public async markSafetyOnboardingSeen(userId: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (user) await this.updateUser({ ...user, hasSeenSafetyOnboarding: true });
  }

  public async acceptLegalTerms(userId: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (user) {
        await this.updateUser({ ...user, hasAcceptedLegalTerms: true, legalAcceptedAt: Date.now() });
        await this.logAudit('LEGAL_ACCEPT', 'USER', userId);
    }
  }

  // --- AUCTION METHODS ---

  public async getAuctions(): Promise<DiscAuction[]> {
    if (config.isMockEnabled) {
        return JSON.parse(localStorage.getItem('discflip_db_auctions') || JSON.stringify(INITIAL_AUCTIONS));
    }
    const { data, error } = await supabase.from('auctions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  public async saveAuction(auction: Partial<DiscAuction>, adminId?: string): Promise<void> {
    if (config.isMockEnabled) {
        const data = JSON.parse(localStorage.getItem('discflip_db_auctions') || JSON.stringify(INITIAL_AUCTIONS));
        const newId = Math.random().toString(36).substr(2, 9);
        data.unshift({ id: newId, status: 'active', createdAt: Date.now(), ...auction });
        localStorage.setItem('discflip_db_auctions', JSON.stringify(data));
        await this.logAudit('AUCTION_CREATE', 'AUCTION', newId);
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${config.apiBaseUrl}/api/auctions/create`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ auctionData: auction })
    });
    if (!response.ok) throw new Error('Listing creation failed safety check.');
  }

  public async hideAuction(auctionId: string): Promise<void> {
    const auctions = await this.getAuctions();
    const updated = auctions.map(a => a.id === auctionId ? { ...a, isHidden: true } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.logAudit('AUCTION_HIDE', 'AUCTION', auctionId);
  }

  public async adminTakedownListing(auctionId: string, adminId: string, reason: string): Promise<void> {
    await this.hideAuction(auctionId);
    await this.logAudit('AUCTION_TAKEDOWN', 'AUCTION', auctionId, { adminId, reason });
  }

  public async processAuctionEndings(): Promise<void> {
    const auctions = await this.getAuctions();
    const now = Date.now();
    let changed = false;
    const updated = auctions.map(a => {
        if (a.status === 'active' && a.endTime < now) {
            changed = true;
            return { ...a, status: a.bidCount > 0 ? 'sold' : 'ended' };
        }
        return a;
    });
    if (changed) localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
  }

  public async calculateSellerPerformance(userId: string): Promise<SellerPerformance> {
    return {
        avgShipTimeMs: 18 * 60 * 60 * 1000,
        trackingComplianceRate: 98,
        lateShipmentRate: 2,
        totalShipments: 45,
        badges: ['Fast Shipper', 'Tracking Always']
    };
  }

  public async placeBid(auctionId: string, bidderId: string, amount: number): Promise<void> {
      if (config.isMockEnabled) {
          const auctions = await this.getAuctions();
          const auction = auctions.find(a => a.id === auctionId);
          if (auction) {
              auction.currentBid = amount;
              auction.bidCount = (auction.bidCount || 0) + 1;
              localStorage.setItem('discflip_db_auctions', JSON.stringify(auctions));
              await this.logAudit('BID_PLACE', 'AUCTION', auctionId, { amount, bidderId });
          }
          return;
      }
      const { error } = await supabase.rpc('place_bid_secure', {
          p_auction_id: auctionId,
          p_bidder_id: bidderId,
          p_amount: amount
      });
      if (error) throw new Error(error.message);
      await this.logAudit('BID_PLACE', 'AUCTION', auctionId, { amount, bidderId });
  }

  // --- ORDER & FULFILLMENT METHODS ---

  public async executeCheckout(userId: string, items: any[], total: number): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (user) await this.updateUser({ ...user, balance: user.balance - total });
    const auctions = await this.getAuctions();
    const ids = items.map(i => i.auctionId);
    const updated = auctions.map(a => ids.includes(a.id) ? { ...a, status: 'sold', buyerId: userId } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.logAudit('CHECKOUT_EXECUTE', 'ORDER_BATCH', userId, { total, itemCount: items.length });
  }

  public async markAsPacked(auctionId: string, proofPhoto: string): Promise<void> {
    const auctions = await this.getAuctions();
    const updated = auctions.map(a => a.id === auctionId ? { ...a, status: 'packed', packagingProofPhoto: proofPhoto } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.logAudit('ORDER_PACKED', 'AUCTION', auctionId);
  }

  public async confirmDelivery(auctionId: string, rating: number): Promise<void> {
    const auctions = await this.getAuctions();
    const updated = auctions.map(a => a.id === auctionId ? { ...a, status: 'completed' } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.logAudit('ORDER_CONFIRMED', 'AUCTION', auctionId, { rating });
  }

  public async reportOrderIssue(auctionId: string, dispute: OrderDispute): Promise<void> {
    const auctions = await this.getAuctions();
    const updated = auctions.map(a => a.id === auctionId ? { ...a, status: 'disputed' } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.submitReport({ targetType: ReportTargetType.Order, targetId: auctionId, category: ReportCategory.Misrepresentation, details: dispute.details });
    await this.logAudit('ORDER_DISPUTE_OPEN', 'AUCTION', auctionId, { reason: dispute.reason });
  }

  public async syncTrackingEvents(auctionId: string): Promise<TrackingEvent[]> {
    return [{ id: '1', timestamp: Date.now(), location: 'Local Hub', message: 'In Transit', type: 'transit' }];
  }

  public getCarrierDeepLink(carrier: string, tracking: string): string {
    return `https://www.google.com/search?q=${carrier}+${tracking}`;
  }

  public async withdrawFunds(userId: string, amount: number, bankId: string): Promise<void> {
    const user = (await this.getUsers()).find(u => u.id === userId);
    if (user) {
        await this.updateUser({ ...user, payoutBalance: user.payoutBalance - amount });
        await this.logAudit('FUNDS_WITHDRAW', 'USER', userId, { amount, bankId });
    }
  }

  // --- ADMIN CORE METHODS ---

  public async getInfraHealth(): Promise<InfraHealth> {
    return {
        webhooks: 'Operational',
        queueBacklog: 12,
        errorRate: 0.05,
        apiLatency: '45ms',
        dbConnections: 84,
        lastPaymentSync: Date.now()
    };
  }

  public async adminGetThreadForOrder(orderId: string): Promise<Thread | null> {
    const threads = await this.getThreads('admin');
    return threads.find(t => t.objectId === orderId) || null;
  }

  public async adminForceRefund(orderId: string, adminId: string, reason: string): Promise<void> {
    const auctions = await this.getAuctions();
    const updated = auctions.map(a => a.id === orderId ? { ...a, status: 'refunded' } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.logAudit('ADMIN_FORCE_REFUND', 'AUCTION', orderId, { adminId, reason });
  }

  public async adminForceClose(orderId: string, adminId: string, reason: string): Promise<void> {
    await this.confirmDelivery(orderId, 5);
    await this.logAudit('ADMIN_FORCE_CLOSE', 'AUCTION', orderId, { adminId, reason });
  }

  public async adminExtendWindow(orderId: string, adminId: string, hours: number): Promise<void> {
    const auctions = await this.getAuctions();
    const updated = auctions.map(a => a.id === orderId ? { ...a, confirmationDeadline: (a.confirmationDeadline || Date.now()) + (hours * 3600000) } : a);
    localStorage.setItem('discflip_db_auctions', JSON.stringify(updated));
    await this.logAudit('ADMIN_EXTEND_WINDOW', 'AUCTION', orderId, { adminId, hours });
  }

  // --- MESSAGING & THREAD METHODS ---

  public async getThreads(userId: string): Promise<Thread[]> {
    if (config.isMockEnabled) return JSON.parse(localStorage.getItem(`discflip_db_threads_${userId}`) || '[]');
    return [];
  }

  public async createOrGetThread(params: any): Promise<string> {
    const threads = await this.getThreads(params.buyerId);
    const existing = threads.find(t => t.objectId === params.objectId);
    if (existing) return existing.id;
    const id = Math.random().toString(36).substr(2, 9);
    threads.push({ id, ...params, participantIds: [params.buyerId, params.sellerId], unreadCount: {}, lastTimestamp: Date.now(), status: 'open' });
    localStorage.setItem(`discflip_db_threads_${params.buyerId}`, JSON.stringify(threads));
    localStorage.setItem(`discflip_db_threads_${params.sellerId}`, JSON.stringify(threads));
    return id;
  }

  public async markThreadAsRead(threadId: string, userId: string): Promise<void> {
    const threads = await this.getThreads(userId);
    const updated = threads.map(t => t.id === threadId ? { ...t, unreadCount: { ...t.unreadCount, [userId]: 0 } } : t);
    localStorage.setItem(`discflip_db_threads_${userId}`, JSON.stringify(updated));
  }

  public async getMessages(threadId: string, userId: string): Promise<Message[]> {
    if (config.isMockEnabled) return JSON.parse(localStorage.getItem(`discflip_db_msgs_${threadId}`) || '[]');
    return [];
  }

  public async sendMessage(threadId: string, senderId: string, text: string, metadata?: any): Promise<void> {
      if (config.isMockEnabled) {
          const msgs = await this.getMessages(threadId, senderId);
          msgs.push({ id: Math.random().toString(36).substr(2, 9), senderId, text, timestamp: Date.now(), isRead: false, ...metadata });
          localStorage.setItem(`discflip_db_msgs_${threadId}`, JSON.stringify(msgs));
          return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${config.apiBaseUrl}/api/messages/send`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ threadId, text, ...metadata })
      });
      if (!response.ok) throw new Error('Signal transmission failed.');
  }

  // --- BOUNTY & TRADE METHODS ---

  public async getBounties(): Promise<Bounty[]> {
    return JSON.parse(localStorage.getItem('discflip_db_bounties') || '[]');
  }

  public async saveBounty(bounty: Partial<Bounty>): Promise<void> {
    const list = await this.getBounties();
    const newId = Math.random().toString(36).substr(2, 9);
    list.push({ id: newId, createdAt: Date.now(), status: 'Open' as any, submissions: [], viewCount: 0, expirationDate: Date.now() + 7 * 86400000, ...bounty } as any);
    localStorage.setItem('discflip_db_bounties', JSON.stringify(list));
    await this.logAudit('BOUNTY_CREATE', 'BOUNTY', newId);
  }

  public async submitBountyMatch(submission: Partial<BountySubmission>): Promise<void> {
    const bounties = await this.getBounties();
    const bounty = bounties.find(b => b.id === submission.bountyId);
    if (bounty) {
        bounty.submissions.push({ id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), ...submission } as any);
        localStorage.setItem('discflip_db_bounties', JSON.stringify(bounties));
        await this.logAudit('BOUNTY_SUBMIT', 'BOUNTY', submission.bountyId!);
    }
  }

  public async getTrades(): Promise<TradeOffer[]> {
    return JSON.parse(localStorage.getItem('discflip_db_trades') || '[]');
  }

  public async createTradeOffer(offer: Partial<TradeOffer>): Promise<void> {
    const list = await this.getTrades();
    const newId = Math.random().toString(36).substr(2, 9);
    list.push({ id: newId, timestamp: Date.now(), status: 'Pending' as any, ...offer } as any);
    localStorage.setItem('discflip_db_trades', JSON.stringify(list));
    await this.logAudit('TRADE_OFFER_CREATE', 'TRADE', newId);
  }

  // --- CLUB METHODS ---

  public async getClubs(): Promise<DiscClub[]> {
    return JSON.parse(localStorage.getItem('discflip_db_clubs') || '[]');
  }

  public async createClub(adminId: string, clubData: Partial<DiscClub>): Promise<string> {
    const clubs = await this.getClubs();
    const id = Math.random().toString(36).substr(2, 9);
    clubs.push({ id, adminId, memberCount: 1, memberIds: [adminId], pendingMemberIds: [], bannedMemberIds: [], rating: 5, isVerified: false, ...clubData } as any);
    localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
    await this.logAudit('CLUB_CREATE', 'CLUB', id);
    return id;
  }

  public async requestToJoinClub(clubId: string, userId: string): Promise<void> {
    const clubs = await this.getClubs();
    const club = clubs.find(c => c.id === clubId);
    if (club) {
        club.pendingMemberIds.push(userId);
        localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
        await this.logAudit('CLUB_JOIN_REQUEST', 'CLUB', clubId);
    }
  }

  public async approveMember(clubId: string, userId: string, adminId: string): Promise<void> {
    const clubs = await this.getClubs();
    const club = clubs.find(c => c.id === clubId);
    if (club && club.adminId === adminId) {
        club.pendingMemberIds = club.pendingMemberIds.filter(id => id !== userId);
        club.memberIds.push(userId);
        club.memberCount++;
        localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
        await this.logAudit('CLUB_MEMBER_APPROVE', 'CLUB', clubId, { userId });
    }
  }

  public async removeMemberFromClub(clubId: string, userId: string, adminId: string): Promise<void> {
    const clubs = await this.getClubs();
    const club = clubs.find(c => c.id === clubId);
    if (club && club.adminId === adminId) {
        club.memberIds = club.memberIds.filter(id => id !== userId);
        club.memberCount--;
        localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
    }
  }

  public async banMemberFromClub(clubId: string, userId: string, adminId: string): Promise<void> {
    const clubs = await this.getClubs();
    const club = clubs.find(c => c.id === clubId);
    if (club && club.adminId === adminId) {
        club.memberIds = club.memberIds.filter(id => id !== userId);
        club.bannedMemberIds.push(userId);
        club.memberCount--;
        localStorage.setItem('discflip_db_clubs', JSON.stringify(clubs));
        await this.logAudit('CLUB_MEMBER_BAN', 'CLUB', clubId, { userId });
    }
  }

  // --- NOTIFICATION METHODS ---

  public async pushNotification(userId: string, notification: Partial<AppNotification>): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.notifications = [...(user.notifications || []), { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), isRead: false, ...notification } as AppNotification];
        await this.updateUser(user);
    }
  }
}

export const db = DatabaseService.getInstance();
