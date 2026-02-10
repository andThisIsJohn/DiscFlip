
import { CartItem, AppNotificationType, DiscAuction } from '../types';
import { config } from './config';
import { db } from './databaseService';

class PaymentService {
    private static instance: PaymentService;

    public static getInstance(): PaymentService {
        if (!PaymentService.instance) PaymentService.instance = new PaymentService();
        return PaymentService.instance;
    }

    /**
     * Sellers must onboard via Stripe Express to receive payouts.
     * This creates a link to the Stripe-hosted KYC flow.
     */
    public async createStripeOnboardingLink(userId: string): Promise<string> {
        if (config.isMockEnabled) {
            console.log("Mock: Initiating Stripe Onboarding Link for", userId);
            return 'https://connect.stripe.com/express/onboarding/mock_session';
        }
        
        const response = await fetch(`${config.apiBaseUrl}/api/payments/onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const { url } = await response.json();
        return url;
    }

    /**
     * Creates a Stripe Checkout session for one or more items.
     * Enforces platform fees (10%) at the time of creation.
     */
    public async createCheckoutSession(userId: string, items: CartItem[]): Promise<void> {
        if (config.isMockEnabled) {
            console.log("Mock: Redirecting to Stripe Checkout for", items.length, "items");
            return;
        }

        const response = await fetch(`${config.apiBaseUrl}/api/payments/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, items })
        });
        const { sessionId } = await response.json();
        
        // Use Stripe.js to redirect
        // @ts-ignore
        const stripe = window.Stripe(config.stripePublicKey);
        await stripe.redirectToCheckout({ sessionId });
    }

    /**
     * Releases funds from platform escrow to seller after safety period.
     */
    public async releaseEscrow(auctionId: string): Promise<void> {
        const auctions = await db.getAuctions();
        const auction = auctions.find(a => a.id === auctionId);
        if (!auction || auction.payoutStatus === 'released') return;

        if (config.isMockEnabled) {
            console.log(`Mock: Releasing $${auction.soldPrice} to seller ${auction.sellerId}`);
            
            const users = await db.getUsers();
            const seller = users.find(u => u.id === auction.sellerId);
            if (seller) {
                const fee = (auction.soldPrice || 0) * 0.10;
                const net = (auction.soldPrice || 0) - fee;
                seller.payoutBalance += net;
                seller.pendingBalance -= (auction.soldPrice || 0);
                await db.updateUser(seller);
            }

            auction.payoutStatus = 'released';
            auction.payoutReleased = true;
            localStorage.setItem('discflip_db_auctions', JSON.stringify(auctions));
            
            await db.pushNotification(auction.sellerId, {
                type: AppNotificationType.PayoutSuccess,
                title: 'Vault Credits Released',
                message: `The $${auction.soldPrice} from your ${auction.mold} sale is now available for withdrawal.`,
                targetId: auction.id
            });
            return;
        }

        await fetch(`${config.apiBaseUrl}/api/payments/release-escrow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auctionId })
        });
    }

    public calculateFees(amount: number) {
        const marketplaceFee = amount * 0.10;
        return {
            marketplaceFee,
            netPayout: amount - marketplaceFee
        };
    }
}

export const payments = PaymentService.getInstance();
