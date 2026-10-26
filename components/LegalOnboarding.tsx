import React, { useState } from 'react';

interface LegalOnboardingProps {
  onComplete: () => void;
}

const LegalOnboarding: React.FC<LegalOnboardingProps> = ({ onComplete }) => {
  const [view, setView] = useState<'intro' | 'terms' | 'disclosures'>('intro');
  const [checks, setChecks] = useState({
    over18: false,
    acceptedTerms: false,
    payoutDisclosure: false,
  });

  const isComplete = checks.over18 && checks.acceptedTerms && checks.payoutDisclosure;

  return (
    <div className="fixed inset-0 z-[500] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-2xl rounded-[64px] shadow-2xl overflow-hidden animate-in zoom-in duration-500 flex flex-col max-h-[90vh]">
        <div className="p-12 md:p-16 text-center space-y-10 flex-grow overflow-y-auto custom-scrollbar">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-black rounded-[28px] flex items-center justify-center text-3xl shadow-xl ring-8 ring-slate-50">
              ⚖️
            </div>
          </div>

          {view === 'intro' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-4">
                  Legal Protocol
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] italic">
                  Securing the marketplace for all hunters.
                </p>
              </div>

              <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 text-left space-y-6">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div
                    className={`mt-1 w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${checks.over18 ? 'bg-black border-black text-white' : 'border-slate-200 bg-white'}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checks.over18}
                      onChange={(e) => setChecks({ ...checks, over18: e.target.checked })}
                    />
                    {checks.over18 && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-black uppercase block">
                      Age Requirement (18+)
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      I verify that I am 18 years of age or older. This is required for vault
                      financial operations.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <div
                    className={`mt-1 w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${checks.acceptedTerms ? 'bg-black border-black text-white' : 'border-slate-200 bg-white'}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checks.acceptedTerms}
                      onChange={(e) => setChecks({ ...checks, acceptedTerms: e.target.checked })}
                    />
                    {checks.acceptedTerms && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-black uppercase block">
                      Terms & Marketplace Rules
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      I have read and agree to the{' '}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setView('terms');
                        }}
                        className="text-orange-600 underline"
                      >
                        Terms of Service
                      </button>{' '}
                      and the{' '}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setView('disclosures');
                        }}
                        className="text-orange-600 underline"
                      >
                        Marketplace Rules
                      </button>
                      .
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <div
                    className={`mt-1 w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${checks.payoutDisclosure ? 'bg-black border-black text-white' : 'border-slate-200 bg-white'}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checks.payoutDisclosure}
                      onChange={(e) => setChecks({ ...checks, payoutDisclosure: e.target.checked })}
                    />
                    {checks.payoutDisclosure && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-black uppercase block">
                      Payout & KYC Disclosures
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      I authorize Stripe Connect to handle my identification data for payouts. PII
                      is encrypted and stored off-platform.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {view === 'terms' && (
            <div className="text-left animate-in slide-in-from-right-4">
              <h3 className="text-xl font-black uppercase mb-6">Terms of Service</h3>
              <div className="prose prose-sm text-slate-500 font-medium text-[10px] uppercase leading-relaxed space-y-4">
                <p>
                  1. <strong>Account Responsibility</strong>: You are responsible for maintaining
                  the security of your vault credentials. DiscFlip is not liable for unauthorized
                  transactions due to owner negligence.
                </p>
                <p>
                  2. <strong>Platform Fees</strong>: DiscFlip captures a 10% commission on every
                  successful sale. This fee supports the Vault Shield escrow and Gemini AI systems.
                </p>
                <p>
                  3. <strong>Prohibited Items</strong>: Listing counterfeit plastic, illegal
                  substances, or non-disc golf gear results in immediate permanent ban.
                </p>
                <p>
                  4. <strong>Dispute Resolution</strong>: All disputes must be filed via the
                  Resolution Center within 72 hours of delivery scan. Independent chargebacks are
                  grounds for vault seizure.
                </p>
              </div>
              <button
                onClick={() => setView('intro')}
                className="mt-8 bg-black text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase"
              >
                Back to Authorization
              </button>
            </div>
          )}

          {view === 'disclosures' && (
            <div className="text-left animate-in slide-in-from-right-4">
              <h3 className="text-xl font-black uppercase mb-6">Marketplace Charter</h3>
              <div className="prose prose-sm text-slate-500 font-medium text-[10px] uppercase leading-relaxed space-y-4">
                <p>
                  1. <strong>Condition Integrity</strong>: Sellers must photograph and disclose all
                  rim scuffs, gouges, and ink. Misrepresentation is a safety violation.
                </p>
                <p>
                  2. <strong>Tracking Mandate</strong>: Shipping must be tracked via the platform
                  studio. Independent shipping is permitted but increases risk scoring.
                </p>
                <p>
                  3. <strong>Escrow Protection</strong>: Funds are held by DiscFlip until the
                  72-hour inspection window closes or the buyer manually releases them.
                </p>
                <p>
                  4. <strong>Communication Safety</strong>: All negotiations must remain in-app.
                  Sharing off-platform payment info triggers an automated safety strike.
                </p>
              </div>
              <button
                onClick={() => setView('intro')}
                className="mt-8 bg-black text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase"
              >
                Back to Authorization
              </button>
            </div>
          )}
        </div>

        <div className="p-12 md:p-16 bg-slate-50 border-t border-slate-100">
          <button
            disabled={!isComplete}
            onClick={onComplete}
            className="w-full bg-black text-orange-500 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-orange-600 hover:text-white transition-all active:scale-95 disabled:opacity-20"
          >
            Digitally Sign & Open Vault
          </button>
          <p className="text-center text-[8px] text-slate-400 font-bold uppercase mt-6 tracking-widest">
            DiscFlip v1.0.0 Compliance Signal • Verified PCI-DSS
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalOnboarding;
