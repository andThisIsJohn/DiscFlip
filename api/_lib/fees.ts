/**
 * DiscFlip fee model (change it here and in services/fees.ts):
 * - The buyer pays the item price + shipping. No buyer fee.
 * - The seller pays a 10% marketplace fee, taken out of their payout.
 *   Card processing (~2.9% + 30¢) comes out of DiscFlip's 10%.
 * - Shipping money stays with DiscFlip to pay for the label it buys through EasyPost.
 */
export const PLATFORM_FEE_RATE = 0.1;

/** What the seller receives for an item, in cents. */
export const sellerPayoutCents = (itemPrice: number) =>
  Math.round(itemPrice * (1 - PLATFORM_FEE_RATE) * 100);
