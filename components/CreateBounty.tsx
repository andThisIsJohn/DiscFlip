import React, { useState } from 'react';
import { User, Bounty, BountyType, BountyVisibility, DomeType } from '../types';

interface CreateBountyProps {
  currentUser: User;
  onClose: () => void;
  onSubmit: (bounty: Partial<Bounty>) => void;
}

const CreateBounty: React.FC<CreateBountyProps> = ({
  currentUser: _currentUser,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<Bounty>>({
    type: BountyType.WTB,
    brand: '',
    mold: '',
    plastic: '',
    weightMin: 173,
    weightMax: 175,
    colorPreference: '',
    colorMustBe: false,
    conditionMin: 9,
    inkAllowed: false,
    domePreference: DomeType.Any,
    glowRequired: false,
    mustBeUnthrown: true,
    priceOffer: 25,
    priceIsShipped: true,
    isVerifiedBounty: false,
    visibility: BountyVisibility.Public,
    autoRenew: true,
  });

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">
              1. The Target Plastic
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Request Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as BountyType })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none"
                >
                  {Object.values(BountyType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Brand
                </label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                  placeholder="e.g. MVP"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Mold
                </label>
                <input
                  value={form.mold}
                  onChange={(e) => setForm({ ...form, mold: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                  placeholder="e.g. Glitch"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Plastic
                </label>
                <input
                  value={form.plastic}
                  onChange={(e) => setForm({ ...form, plastic: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                  placeholder="e.g. Soft Neutron"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">
              2. Technical Specifications
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Min Weight (g)
                </label>
                <input
                  type="number"
                  value={form.weightMin}
                  onChange={(e) => setForm({ ...form, weightMin: Number(e.target.value) })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Max Weight (g)
                </label>
                <input
                  type="number"
                  value={form.weightMax}
                  onChange={(e) => setForm({ ...form, weightMax: Number(e.target.value) })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Dome Preference
                </label>
                <div className="flex gap-2">
                  {Object.values(DomeType).map((d) => (
                    <button
                      key={d}
                      onClick={() => setForm({ ...form, domePreference: d })}
                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${form.domePreference === d ? 'bg-black border-black text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.mustBeUnthrown}
                  onChange={(e) => setForm({ ...form, mustBeUnthrown: e.target.checked })}
                  className="accent-black w-5 h-5"
                />
                <span className="text-[10px] font-black uppercase text-black">
                  Unthrown Only (10/10)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.inkAllowed}
                  onChange={(e) => setForm({ ...form, inkAllowed: e.target.checked })}
                  className="accent-black w-5 h-5"
                />
                <span className="text-[10px] font-black uppercase text-black">Ink is OK?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.glowRequired}
                  onChange={(e) => setForm({ ...form, glowRequired: e.target.checked })}
                  className="accent-black w-5 h-5"
                />
                <span className="text-[10px] font-black uppercase text-black">
                  Glow Plastic Mandatory
                </span>
              </label>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">
              3. Rewards & Security
            </h3>
            <div className="bg-black p-8 rounded-[40px] text-white mb-8">
              <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4 block">
                Bounty Reward ($)
              </label>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black">$</span>
                <input
                  type="number"
                  value={form.priceOffer}
                  onChange={(e) => setForm({ ...form, priceOffer: Number(e.target.value) })}
                  className="bg-transparent border-none outline-none text-5xl font-black w-full"
                />
              </div>
              <div className="mt-6 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.priceIsShipped}
                    onChange={(e) => setForm({ ...form, priceIsShipped: e.target.checked })}
                    className="accent-orange-500"
                  />
                  Reward Includes Shipping
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer ${form.isVerifiedBounty ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-slate-50'}`}
                onClick={() => setForm({ ...form, isVerifiedBounty: !form.isVerifiedBounty })}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-black text-black uppercase">
                    Verified Bounty (High Trust)
                  </h4>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${form.isVerifiedBounty ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}
                  >
                    {form.isVerifiedBounty && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 leading-relaxed uppercase font-black">
                  Requires seller to provide rim, bottom, and weight proof photos. Priority feed
                  placement.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Who can hunt?
                </label>
                <select
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({ ...form, visibility: e.target.value as BountyVisibility })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none"
                >
                  {Object.values(BountyVisibility).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-black text-black tracking-tight uppercase leading-none mb-1">
              Issue Bounty
            </h2>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 w-10 rounded-full transition-all duration-500 ${i <= step ? 'bg-orange-600' : 'bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-black"
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

        <div className="p-12 min-h-[400px]">{renderStep()}</div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
            className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-black"
          >
            {step === 1 ? 'Discard' : 'Back'}
          </button>
          <button
            onClick={step === 3 ? () => onSubmit(form) : () => setStep((s) => s + 1)}
            className="bg-black text-orange-500 px-12 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-orange-600 hover:text-white transition-all active:scale-95"
          >
            {step === 3 ? 'Authorize & Post' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBounty;
