import React, { useState } from 'react';
import { User } from '../types';
import { payments } from '../services/paymentService';
import { config } from '../services/config';
import { db } from '../services/databaseService';

interface StripeOnboardingCardProps {
  user: User;
  onUpdate: () => void;
}

const StripeOnboardingCard: React.FC<StripeOnboardingCardProps> = ({ user, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleOnboard = async () => {
    setIsLoading(true);
    try {
      if (config.isMockEnabled) {
        // Demo mode: pretend Stripe onboarding finished
        await db.updateUser({ ...user, stripeOnboardingComplete: true });
        onUpdate();
        return;
      }
      const url = await payments.createStripeOnboardingLink(user.id);
      window.location.href = url; // Redirect to Stripe
    } catch (e: any) {
      alert(`Could not connect to Stripe: ${e?.message || 'check your internet connection.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (user.stripeOnboardingComplete) {
    return (
      <div className="bg-white border border-slate-100 p-8 rounded-[48px] shadow-sm relative overflow-hidden group">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-1">
              Stripe Status
            </span>
            <div className="text-2xl font-black text-black">Payments Enabled</div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">
              Vault connected to your bank
            </p>
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-2xl">
            ✅
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-indigo-600 p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
      <div className="relative z-10">
        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-2">
          Payout Verification Required
        </span>
        <div className="text-2xl font-black mb-4 tracking-tighter">
          Connect your vault to Stripe
        </div>
        <p className="text-[10px] font-medium text-indigo-100 leading-relaxed uppercase mb-6 opacity-80">
          Sellers must complete identity verification (KYC) to receive payouts. Safe, secure, and
          PCI compliant.
        </p>
        <button
          onClick={handleOnboard}
          disabled={isLoading}
          className="w-full py-4 bg-white text-indigo-600 rounded-[24px] font-black uppercase text-[11px] tracking-widest hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-50"
        >
          {isLoading ? 'Requesting Vault Access...' : 'Complete Onboarding'}
        </button>
      </div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
    </div>
  );
};

export default StripeOnboardingCard;
