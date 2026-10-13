import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/databaseService';

interface WithdrawModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ user, onClose, onSuccess }) => {
  const defaultBank = (user.bankAccounts || [])[0];

  const [step, setStep] = useState(defaultBank ? 1 : 0);
  const [amount, setAmount] = useState<number>(user.payoutBalance);
  const [isProcessing, setIsProcessing] = useState(false);

  const isVerificationRequired = user.requiresIdForPayout && !user.isIdentityVerified;

  const handleWithdraw = async () => {
    if (isVerificationRequired) {
      alert(
        'Identity Verification Required: Due to safety signals on your account, we require photo ID verification before funds can be withdrawn. Please visit the Verification Center.'
      );
      return;
    }
    if (!defaultBank || amount <= 0 || amount > user.payoutBalance) return;

    setIsProcessing(true);
    // Simulate secure ACH transfer handshake
    setTimeout(async () => {
      await db.withdrawFunds(user.id, amount, defaultBank.id);
      setIsProcessing(false);
      setStep(2); // Success step
    }, 2500);
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest">
            Processing ACH Transfer...
          </h3>
          <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">
            Vault handshake in progress
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight uppercase">
              Earnings Payout
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Direct Deposit Withdrawal
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-black transition-colors p-2 hover:bg-white rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-10">
          {isVerificationRequired && (
            <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl">
              <h4 className="text-xs font-black text-red-700 uppercase tracking-tight mb-2">
                Verification Required
              </h4>
              <p className="text-[10px] text-red-600 leading-relaxed font-medium uppercase">
                For security reasons, your account requires a one-time Identity Verification before
                payout authorization.
              </p>
            </div>
          )}

          {step === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-black text-black uppercase mb-2">No Linked Bank</h3>
              <p className="text-slate-500 text-sm mb-8">
                You must link a verified bank account in Profile Settings before you can withdraw
                earnings.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-black text-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest"
              >
                Return to Settings
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Available for Withdrawal
                </span>
                <div className="text-5xl font-black text-black tracking-tighter">
                  ${user.payoutBalance.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                  Payout Amount
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) =>
                      setAmount(Math.min(user.payoutBalance, Number(e.target.value)))
                    }
                    className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-[24px] outline-none focus:border-orange-500 font-black text-3xl text-black"
                  />
                </div>
              </div>

              <button
                onClick={handleWithdraw}
                className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${isVerificationRequired ? 'bg-red-600 text-white' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
              >
                {isVerificationRequired ? 'Verify Identity to Payout' : 'Confirm Transfer'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 shadow-inner">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-black tracking-tight uppercase mb-4">
                Transfer Started
              </h2>
              <button
                onClick={() => {
                  onSuccess(amount);
                  onClose();
                }}
                className="w-full bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;
