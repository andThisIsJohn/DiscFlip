import React, { useState } from 'react';
import { PaymentMethod } from '../types';

interface AddPaymentMethodFormProps {
  onCancel: () => void;
  onSave: (method: PaymentMethod) => void;
}

const AddPaymentMethodForm: React.FC<AddPaymentMethodFormProps> = ({ onCancel, onSave }) => {
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      const newMethod: PaymentMethod = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'card',
        last4: cardData.number.slice(-4),
        expiry: cardData.expiry,
        brand: 'Visa',
        isDefault: false,
      };
      onSave(newMethod);
      setIsSaving(false);
    }, 1500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-top-4">
      <div className="bg-black rounded-[32px] p-6 text-white mb-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="w-12 h-8 bg-orange-400/20 rounded-md border border-orange-400/30 flex items-center justify-center">
              <div className="w-8 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-sm"></div>
            </div>
            <span className="text-xl font-black italic tracking-tighter text-white">
              DISC<span className="text-orange-500">FLIP</span> VAULT
            </span>
          </div>
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Safe Card ID
            </p>
            <p className="text-xl font-black tracking-[0.2em] text-white">
              {cardData.number
                ? cardData.number.replace(/\d(?=\d{4})/g, '•')
                : '•••• •••• •••• ••••'}
            </p>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Disc Hunter
              </p>
              <p className="text-xs font-black uppercase text-white">
                {cardData.name || 'HOLDER NAME'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Expires
              </p>
              <p className="text-xs font-black text-white">{cardData.expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Card Number
          </label>
          <input
            type="text"
            required
            maxLength={16}
            placeholder="0000 0000 0000 0000"
            value={cardData.number}
            onChange={(e) =>
              setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '') })
            }
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-black"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Cardholder Name
          </label>
          <input
            type="text"
            required
            placeholder="HOLDER NAME"
            value={cardData.name}
            onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold uppercase text-black"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Expiry
          </label>
          <input
            type="text"
            required
            placeholder="MM/YY"
            maxLength={5}
            value={cardData.expiry}
            onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-black"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            CVV
          </label>
          <input
            type="password"
            required
            maxLength={3}
            placeholder="•••"
            value={cardData.cvv}
            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-black"
          />
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
        <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
          End-to-End Vault Shield Active
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
          {isSaving ? 'Verifying...' : 'Save Vault Card'}
        </button>
      </div>
    </form>
  );
};

export default AddPaymentMethodForm;
