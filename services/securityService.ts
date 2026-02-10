
import { db } from './databaseService';
import { RestrictionLevel, AppNotificationType } from '../types';

class SecurityService {
    private static instance: SecurityService;
    
    // In-memory rate limits for current session (Simulating Redis/Server-side)
    private limits: Record<string, { count: number; resetAt: number }> = {};

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) SecurityService.instance = new SecurityService();
        return SecurityService.instance;
    }

    /**
     * Enforce rate limits for specific actions
     */
    public checkRateLimit(userId: string, action: 'bid' | 'listing' | 'dm' | 'login', limit: number, windowMs: number): boolean {
        const key = `${userId}:${action}`;
        const now = Date.now();
        
        if (!this.limits[key] || now > this.limits[key].resetAt) {
            this.limits[key] = { count: 1, resetAt: now + windowMs };
            return true;
        }

        if (this.limits[key].count >= limit) {
            return false;
        }

        this.limits[key].count++;
        return true;
    }

    /**
     * Scan text for high-risk off-platform payment attempts
     */
    public scanForOffPlatformTriggers(text: string): { flagged: boolean; reason?: string } {
        const blacklist = [
            /\bvenmo\b/i, /\bzelle\b/i, /\bcashapp\b/i, /\bpaypal\s+f&f\b/i, 
            /\bfriends\s+and\s+family\b/i, /\btext\s+me\s+at\b/i, /\bwhatsapp\b/i,
            /\boutside\s+the\s+app\b/i, /\bpay\s+me\s+directly\b/i
        ];

        const match = blacklist.find(pattern => pattern.test(text));
        if (match) {
            return { flagged: true, reason: 'Off-platform payment attempt' };
        }

        return { flagged: false };
    }

    /**
     * Masks PII like phone numbers and emails to protect users until an order is confirmed.
     */
    public maskPII(text: string): string {
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        const phoneRegex = /(\+?\d{1,4}?[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
        
        return text
            .replace(emailRegex, "[EMAIL MASKED - USE SECURE VAULT]")
            .replace(phoneRegex, "[PHONE MASKED - USE SECURE VAULT]");
    }

    /**
     * Automated strike system for abusive patterns
     */
    public async autoEnforce(userId: string, reason: string) {
        const user = (await db.getUsers()).find(u => u.id === userId);
        if (!user) return;

        const newStrikes = (user.strikes || 0) + 1;
        let newLevel = user.restrictionLevel;

        if (newStrikes >= 5) newLevel = RestrictionLevel.Banned;
        else if (newStrikes >= 3) newLevel = RestrictionLevel.AccountFreeze;
        else if (newStrikes >= 1) newLevel = RestrictionLevel.Warning;

        await db.updateUser({
            ...user,
            strikes: newStrikes,
            restrictionLevel: newLevel,
            restrictionExpires: Date.now() + (86400000 * newStrikes) // Escalating duration
        });

        await db.pushNotification(userId, {
            // Fixed: Using AppNotificationType enum instead of string literal
            type: AppNotificationType.SystemAlert,
            title: 'Account Restricted',
            message: `Automated safety signal detected: ${reason}. A strike has been issued.`,
            targetId: userId
        });
    }
}

export const security = SecurityService.getInstance();
