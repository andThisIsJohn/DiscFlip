/**
 * DiscFlip fee model, shared by the screens (keep in sync with api/_lib/fees.ts):
 * the buyer pays item price + shipping; the seller pays a 10% marketplace fee out of the payout.
 */
export const PLATFORM_FEE_RATE = 0.1;

export const calculateSellerFees = (itemPrice: number) => {
  const marketplaceFee = Math.round(itemPrice * PLATFORM_FEE_RATE * 100) / 100;
  return { marketplaceFee, netPayout: Math.round((itemPrice - marketplaceFee) * 100) / 100 };
};
