import React, { useState } from 'react';
import { BankAccount } from '../types';

interface LinkBankFormProps {
  onCancel: () => void;
  onSave: (bank: BankAccount) => void;
}

const LinkBankForm: React.FC<LinkBankFormProps> = ({ onCancel, onSave }) => {
  // Fix: Explicitly type the formData state to allow both 'checking' and 'savings'
  const [formData, setFormData] = useState<{
    bankName: string;
    routing: string;
    account: string;
    type: 'checking' | 'savings';
  }>({
    bankName: '',
    routing: '',
    account: '',
    type: 'checking',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate secure verification process (e.g. Plaid-style handshake)
    setTimeout(() => {
      const newBank: BankAccount = {
        id: Math.random().toString(36).substr(2, 9),
        bankName: formData.bankName || 'Standard Chartered',
        accountType: formData.type,
        last4: formData.account.slice(-4),
        routingNumber: formData.routing,
        isVerified: true,
      };
      onSave(newBank);
      setIsSaving(false);
    }, 2000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-orange-600 shadow-sm border border-orange-100">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-black uppercase tracking-tight">Direct Payouts</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
          Connect your earnings vault
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Bank Institution
          </label>
          <input
            required
            placeholder="e.g. Chase, Wells Fargo..."
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Account Type
            </label>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'checking' })}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'checking' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-black'}`}
              >
                Checking
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'savings' })}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'savings' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-black'}`}
              >
                Savings
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Routing Number
            </label>
            <input
              required
              maxLength={9}
              placeholder="000000000"
              value={formData.routing}
              onChange={(e) =>
                setFormData({ ...formData, routing: e.target.value.replace(/\D/g, '') })
              }
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Account Number
            </label>
            <input
              required
              placeholder="000000000"
              value={formData.account}
              onChange={(e) =>
                setFormData({ ...formData, account: e.target.value.replace(/\D/g, '') })
              }
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
            />
          </div>
        </div>
      </div>

      <div className="bg-black rounded-2xl p-4 flex items-center gap-3 border border-orange-500/30">
        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-[8px] text-orange-500 font-black uppercase tracking-[0.2em]">
          Verified Secure Handshake • 256-bit Encrypted
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-black transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-[2] bg-black text-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl disabled:opacity-50"
        >
          {isSaving ? 'Connecting...' : 'Authorize Bank'}
        </button>
      </div>
    </form>
  );
};

export default LinkBankForm;
