import { CartItem, AppNotificationType, ShippingAddress } from '../types';
import { config } from './config';
import { calculateSellerFees } from './fees';
import { db } from './databaseService';
import { supabase } from './supabaseClient';

const authHeaders = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
};

const postJson = async (path: string, body: any) => {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `Payment service error (${response.status})`);
  return json;
};

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
      console.log('Mock: Initiating Stripe Onboarding Link for', userId);
      return 'https://connect.stripe.com/express/onboarding/mock_session';
    }
    const { url } = await postJson('/api/payments/onboard', {});
    return url;
  }

  /** After returning from Stripe onboarding: re-check whether payouts are enabled. */
  public async refreshStripeStatus(): Promise<boolean> {
    if (config.isMockEnabled) return true;
    const { complete } = await postJson('/api/payments/account-status', {});
    return Boolean(complete);
  }

  /**
   * Creates a Stripe Checkout session for one or more items and sends the browser to
   * Stripe's hosted payment page. Stripe brings the buyer back to /?checkout=success.
   * Prices are looked up on the server, never trusted from the browser.
   */
  public async createCheckoutSession(
    userId: string,
    items: CartItem[],
    shippingAddress?: ShippingAddress
  ): Promise<void> {
    if (config.isMockEnabled) {
      console.log('Mock: Redirecting to Stripe Checkout for', items.length, 'items');
      return;
    }

    const { url } = await postJson('/api/payments/checkout', { items, shippingAddress });
    if (!url) throw new Error('Stripe did not return a checkout page.');
    window.location.assign(url);
    // Keep the "processing" screen up while the browser navigates away
    await new Promise(() => {});
  }

  /**
   * Releases funds from platform escrow to seller after safety period.
   */
  public async releaseEscrow(auctionId: string): Promise<void> {
    if (config.isMockEnabled) {
      const auction = (await db.getAuctions()).find((a) => a.id === auctionId);
      if (!auction || auction.payoutStatus === 'released') return;
      console.log(`Mock: Releasing $${auction.soldPrice} to seller ${auction.sellerId}`);

      const users = await db.getUsers();
      const seller = users.find((u) => u.id === auction.sellerId);
      if (seller) {
        const { netPayout } = this.calculateFees(auction.soldPrice || 0);
        seller.payoutBalance += netPayout;
        seller.pendingBalance -= auction.soldPrice || 0;
        await db.updateUser(seller);
      }

      const all = await db.getAuctions();
      localStorage.setItem(
        'discflip_db_auctions',
        JSON.stringify(
          all.map((a) =>
            a.id === auctionId ? { ...a, payoutStatus: 'released', payoutReleased: true } : a
          )
        )
      );

      await db.pushNotification(auction.sellerId, {
        type: AppNotificationType.PayoutSuccess,
        title: 'Vault Credits Released',
        message: `The $${auction.soldPrice} from your ${auction.mold} sale is now available for withdrawal.`,
        targetId: auction.id,
      });
      return;
    }

    await postJson('/api/payments/release-escrow', { auctionId });
  }

  public calculateFees(amount: number) {
    return calculateSellerFees(amount);
  }
}

export const payments = PaymentService.getInstance();
