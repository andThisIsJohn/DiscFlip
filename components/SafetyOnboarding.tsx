import React from 'react';

interface SafetyOnboardingProps {
  onComplete: () => void;
}

const SafetyOnboarding: React.FC<SafetyOnboardingProps> = ({ onComplete }) => {
  return (
    <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-2xl rounded-[64px] shadow-2xl overflow-hidden animate-in zoom-in duration-500 flex flex-col">
        <div className="p-12 md:p-16 text-center space-y-12">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-orange-100 rounded-[32px] flex items-center justify-center text-5xl shadow-xl ring-8 ring-orange-50 animate-bounce">
              🛡️
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-4">
              The Hunter&apos;s Code
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] italic">
              Safe trades. Genuine plastic. Every single time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="space-y-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
              <h3 className="text-sm font-black uppercase text-black">1. No Off-Platform</h3>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase">
                Never pay via Venmo, Zelle, or CashApp. Protection only applies to in-vault credits
                and secure checkout.
              </p>
            </div>
            <div className="space-y-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
              <h3 className="text-sm font-black uppercase text-black">2. Always Track</h3>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase">
                Use our shipping studio for automated tracking. Items without signals are high risk
                for both hunters.
              </p>
            </div>
            <div className="space-y-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
              <h3 className="text-sm font-black uppercase text-black">3. Condition Clarity</h3>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase">
                Disclose all ink and scuffs. Our Gemini AI scans for undisclosed flaws—honesty keeps
                your rating high.
              </p>
            </div>
            <div className="space-y-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
              <h3 className="text-sm font-black uppercase text-black">4. Vault Shield</h3>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase">
                Your payout is held in escrow until delivery is confirmed. This ensures hunters get
                what they bought.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onComplete}
              className="w-full bg-black text-orange-500 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-orange-600 hover:text-white transition-all active:scale-95"
            >
              I Accept the Safety Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyOnboarding;
