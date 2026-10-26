import React, { useState } from 'react';
import { DiscAuction, PackagePreset } from '../types';
import { calculateSellerFees } from '../services/fees';
import { shipping } from '../services/shippingService';

interface LabelPurchaseModalProps {
  auction: DiscAuction;
  onClose: () => void;
  onSuccess: (tracking: string) => void;
}

const PACKAGE_PRESETS: PackagePreset[] = [
  {
    id: '1-disc',
    name: '1 Disc Bubble Mailer',
    type: 'mailer',
    length: 13,
    width: 10,
    height: 1,
    maxDiscs: 1,
    tareWeightOz: 2.5,
  },
  {
    id: 'small-box',
    name: '2-3 Discs Small Box',
    type: 'box',
    length: 10,
    width: 10,
    height: 2,
    maxDiscs: 3,
    tareWeightOz: 6.0,
  },
  {
    id: 'medium-box',
    name: '4-8 Discs Medium Box',
    type: 'box',
    length: 12,
    width: 12,
    height: 4,
    maxDiscs: 8,
    tareWeightOz: 10.0,
  },
];

const LabelPurchaseModal: React.FC<LabelPurchaseModalProps> = ({ auction, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PackagePreset>(PACKAGE_PRESETS[0]);
  const [carrier, setCarrier] = useState<'USPS' | 'UPS'>('USPS');
  const [addPackingWeight, setAddPackingWeight] = useState(true);

  // Auto-fill weights
  const discWeightOz = (auction.weight || 175) / 28.35; // g to oz
  const totalWeightOz = Math.ceil(
    discWeightOz + selectedPreset.tareWeightOz + (addPackingWeight ? 1.5 : 0)
  );

  // The label is paid from the shipping the buyer already paid, so it isn't taken from the payout
  const { marketplaceFee: marketFee, netPayout } = calculateSellerFees(auction.soldPrice || 0);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const result = await shipping.createLabel({
        auctionId: auction.id,
        carrier,
        preset: selectedPreset,
        weightOz: totalWeightOz,
      });
      setIsPurchasing(false);
      window.open(result.labelUrl, '_blank'); // Open PDF in new tab
      onSuccess(result.tracking);
    } catch (e: any) {
      alert(e.message);
      setIsPurchasing(false);
    }
  };

  if (isPurchasing) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-y-auto [align-items:safe_center]">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-xl font-black text-white uppercase tracking-widest">
            Purchasing Label...
          </h3>
          <p className="text-orange-500 text-[10px] font-black uppercase mt-2 animate-pulse">
            Requesting from Carrier API
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight uppercase">
              Shipping Studio
            </h2>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 w-10 rounded-full ${step >= i ? 'bg-orange-600' : 'bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-black transition-colors"
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

        <div className="p-12 overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in">
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Carrier & Address Verification
                </h3>
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-lg">
                      🏠
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-black">
                        {auction.buyerShippingAddress?.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {auction.buyerShippingAddress?.street}, {auction.buyerShippingAddress?.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full text-green-700 text-[8px] font-black uppercase tracking-widest">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified Deliverable
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Carrier Selection
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCarrier('USPS')}
                    className={`p-6 rounded-[32px] border-2 text-left transition-all ${carrier === 'USPS' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white'}`}
                  >
                    <p className="font-black text-blue-800 text-sm">USPS</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      Ground Advantage (Cheapest)
                    </p>
                  </button>
                  <button
                    onClick={() => setCarrier('UPS')}
                    className={`p-6 rounded-[32px] border-2 text-left transition-all ${carrier === 'UPS' ? 'border-amber-600 bg-amber-50/50' : 'border-slate-100 bg-white'}`}
                  >
                    <p className="font-black text-amber-900 text-sm">UPS</p>
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                      Ground (Heavy Box Reliable)
                    </p>
                  </button>
                </div>
              </section>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl"
              >
                Select Package & Weight
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-in slide-in-from-right-4">
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Package Preset
                </h3>
                <div className="space-y-3">
                  {PACKAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className={`w-full p-6 rounded-[32px] border-2 flex justify-between items-center transition-all ${selectedPreset.id === preset.id ? 'border-black bg-slate-50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="text-left">
                        <p className="font-black text-black text-sm uppercase">{preset.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {preset.length}&quot;x{preset.width}&quot;x{preset.height}&quot; • Max{' '}
                          {preset.maxDiscs} Discs
                        </p>
                      </div>
                      {selectedPreset.id === preset.id && (
                        <div className="w-6 h-6 bg-black text-orange-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Calculated Weight
                    </h3>
                    <p className="text-3xl font-black text-black">{totalWeightOz} oz</p>
                  </div>
                  <div className="text-right">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        Packing Material?
                      </span>
                      <input
                        type="checkbox"
                        checked={addPackingWeight}
                        onChange={(e) => setAddPackingWeight(e.target.checked)}
                        className="w-5 h-5 accent-orange-600"
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Disc', v: `${discWeightOz.toFixed(1)} oz` },
                    { l: 'Tare', v: `${selectedPreset.tareWeightOz} oz` },
                    { l: 'Extra', v: addPackingWeight ? '1.5 oz' : '0 oz' },
                  ].map((w) => (
                    <div
                      key={w.l}
                      className="bg-white p-3 rounded-2xl text-center border border-slate-200"
                    >
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                        {w.l}
                      </span>
                      <span className="text-xs font-black text-black">{w.v}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl"
                >
                  Confirm Payout
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 animate-in slide-in-from-right-4">
              <div className="bg-black p-10 rounded-[48px] text-white relative overflow-hidden shadow-2xl">
                <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-8">
                  Seller Net Payout Summary
                </h3>
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between font-black uppercase text-[11px] tracking-widest">
                    <span className="text-slate-500">Sold Price</span>
                    <span>${auction.soldPrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black uppercase text-[11px] tracking-widest">
                    <span className="text-slate-500">DiscFlip Fee (10%)</span>
                    <span className="text-red-400">-${marketFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black uppercase text-[11px] tracking-widest">
                    <span className="text-slate-500">Label ({carrier})</span>
                    <span className="text-green-400">Covered by buyer&apos;s shipping</span>
                  </div>
                  <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xl font-black uppercase tracking-tighter">
                      Your Payout
                    </span>
                    <span className="text-4xl font-black text-orange-500 tracking-tighter">
                      ${netPayout.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Back
                </button>
                <button
                  onClick={handlePurchase}
                  className="flex-[2] bg-orange-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl hover:bg-orange-500 transition-all active:scale-95"
                >
                  Purchase Label
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabelPurchaseModal;
