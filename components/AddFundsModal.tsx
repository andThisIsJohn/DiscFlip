import React, { useState } from 'react';
import { PaymentMethod } from '../types';

interface AddFundsModalProps {
  onClose: () => void;
  onSuccess: (amount: number) => void;
  currentBalance: number;
  paymentMethods?: PaymentMethod[];
}

const AddFundsModal: React.FC<AddFundsModalProps> = ({
  onClose,
  onSuccess,
  currentBalance,
  paymentMethods = [],
}) => {
  const defaultMethod =
    paymentMethods.find((m) => m.isDefault) ||
    (paymentMethods.length > 0 ? paymentMethods[0] : null);

  const [step, setStep] = useState(defaultMethod ? 1 : 0); // Step 0 is 'no methods' warning
  const [amount, setAmount] = useState<number>(50);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    defaultMethod?.id || null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const amounts = [10, 25, 50, 100, 250];

  const handleProcess = () => {
    if (!selectedMethodId) return;
    setIsProcessing(true);
    // Simulate secure API handshake
    setTimeout(() => {
      onSuccess(amount);
      setIsProcessing(false);
      setStep(3); // Success step
    }, 2200);
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest">
            Vault Handshake...
          </h3>
          <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">
            Verifying through secure gateway
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight uppercase">Safe Top-Up</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Instant Vault Authorization
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
          {step === 0 && (
            <div className="text-center py-8 animate-in fade-in">
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
              <h3 className="text-xl font-black text-black uppercase mb-2">
                No Vault Methods Found
              </h3>
              <p className="text-slate-500 text-sm mb-8">
                You must link a payment method in your Profile Settings before you can top-up your
                credits.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-black text-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest"
              >
                Update Settings
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                  Select Credit Amount
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {amounts.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className={`py-4 rounded-2xl font-black text-lg transition-all border-2 ${amount === a ? 'bg-black border-black text-orange-500 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-orange-200'}`}
                    >
                      ${a}
                    </button>
                  ))}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Cstm"
                      className="w-full pl-7 pr-3 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-black text-black"
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                  Payment Source
                </label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${selectedMethodId === method.id ? 'bg-white border-orange-500 shadow-md' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-lg">{method.type === 'card' ? '💳' : '🅿️'}</div>
                        <div className="text-left">
                          <p
                            className={`text-xs font-black uppercase ${selectedMethodId === method.id ? 'text-black' : 'text-slate-400'}`}
                          >
                            {method.brand || 'Method'} •••• {method.last4 || 'xxxx'}
                          </p>
                          {method.isDefault && (
                            <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">
                              Primary Vault
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethodId === method.id ? 'border-orange-600 bg-orange-600' : 'border-slate-300'}`}
                      >
                        {selectedMethodId === method.id && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95"
              >
                Review Recharge
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <div className="bg-black p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                      Transaction Summary
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Secured
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-400">Amount</span>
                      <span className="text-2xl font-black">${amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">
                        Charge Total
                      </span>
                      <span className="text-3xl font-black text-orange-500">
                        ${amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleProcess}
                  className="w-full bg-orange-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl hover:bg-orange-500 transition-all active:scale-95"
                >
                  Authorize & Add Credits
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-black transition-colors"
                >
                  Modify Amount
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified Handshake • 256-bit AES Encryption
              </div>
            </div>
          )}

          {step === 3 && (
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
                Vault Refilled
              </h2>
              <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 mb-10">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">
                  New Account Balance
                </span>
                <span className="text-4xl font-black tracking-tighter text-black">
                  ${(currentBalance + amount).toFixed(2)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all"
              >
                Continue to Market
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFundsModal;
