import React, { useState } from 'react';
import { discArtUrl } from '../utils/placeholderArt';
import {
  DiscAuction,
  User,
  DiscCondition,
  AuctionType,
  DomeType,
  PlasticFeel,
  StampType,
  FlightOffset,
  VerificationTier,
} from '../types';

interface BulkListerProps {
  currentUser: User;
  onClose: () => void;
  onSubmit: (auctions: Partial<DiscAuction>[]) => void | Promise<void>;
}

const BulkLister: React.FC<BulkListerProps> = ({ currentUser, onClose, onSubmit }) => {
  const [globalDefaults, setGlobalDefaults] = useState({
    brand: 'Innova',
    shippingCost: 5,
    type: AuctionType.Standard,
    condition: DiscCondition.New,
    startPrice: 20,
  });

  const [rows, setRows] = useState<Partial<DiscAuction>[]>([
    { mold: '', plastic: '', weight: 175 },
    { mold: '', plastic: '', weight: 175 },
    { mold: '', plastic: '', weight: 175 },
  ]);

  const addRow = () => setRows([...rows, { mold: '', plastic: '', weight: 175 }]);

  const updateRow = (index: number, field: keyof DiscAuction, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleLaunch = () => {
    const fullAuctions = rows
      .filter((r) => r.mold && r.plastic)
      .map((r) => ({
        ...globalDefaults,
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        sellerId: currentUser.id,
        seller: currentUser.name,
        status: 'active' as const,
        startTime: Date.now(),
        endTime: Date.now() + 86400000 * 3,
        bids: [],
        watcherCount: 0,
        viewCount: 0,
        bidCount: 0,
        verificationTier: VerificationTier.Basic,
        flightNumbers: { speed: 7, glide: 5, turn: 0, fade: 2 },
        flightOffset: FlightOffset.TrueToNumbers,
        dome: DomeType.Mild,
        plasticFeel: PlasticFeel.Stiff,
        stampType: StampType.Stock,
        hasInk: false,
        communityFeelTags: [],
        qrCodeId: `QR-${Math.random().toString(36).toUpperCase().substr(2, 6)}`,
        imageUrl: discArtUrl('#0f766e', '#99f6e4'),
      }));
    onSubmit(fullAuctions as any);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-black text-black tracking-tighter uppercase leading-none mb-1">
              Bulk Listing Mode
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Speed listing for pro sellers
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-black transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleLaunch}
              className="bg-black text-orange-500 px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all"
            >
              Launch {rows.filter((r) => r.mold).length} Items
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-hidden flex">
          {/* Settings Sidebar */}
          <div className="w-80 border-r border-slate-100 p-8 overflow-y-auto space-y-8 bg-slate-50/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Global Defaults
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">
                  Brand
                </label>
                <input
                  value={globalDefaults.brand}
                  onChange={(e) => setGlobalDefaults({ ...globalDefaults, brand: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">
                  Base Shipping ($)
                </label>
                <input
                  type="number"
                  value={globalDefaults.shippingCost}
                  onChange={(e) =>
                    setGlobalDefaults({ ...globalDefaults, shippingCost: Number(e.target.value) })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">
                  Starting Price ($)
                </label>
                <input
                  type="number"
                  value={globalDefaults.startPrice}
                  onChange={(e) =>
                    setGlobalDefaults({ ...globalDefaults, startPrice: Number(e.target.value) })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Listing Table */}
          <div className="flex-grow overflow-y-auto p-8">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="text-left px-4">Photo</th>
                  <th className="text-left px-4">Mold</th>
                  <th className="text-left px-4">Plastic</th>
                  <th className="text-left px-4">Weight</th>
                  <th className="text-left px-4">Price Adj</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="group bg-slate-50 hover:bg-white transition-all rounded-2xl border border-transparent hover:border-slate-200 shadow-sm"
                  >
                    <td className="p-3 first:rounded-l-2xl">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-black group-hover:text-orange-500 transition-all">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4">
                      <input
                        value={row.mold}
                        onChange={(e) => updateRow(idx, 'mold', e.target.value)}
                        placeholder="e.g. Wraith"
                        className="bg-transparent border-b border-slate-200 p-2 w-full outline-none font-bold text-sm focus:border-black transition-all"
                      />
                    </td>
                    <td className="px-4">
                      <input
                        value={row.plastic}
                        onChange={(e) => updateRow(idx, 'plastic', e.target.value)}
                        placeholder="e.g. Star"
                        className="bg-transparent border-b border-slate-200 p-2 w-full outline-none font-bold text-sm focus:border-black transition-all"
                      />
                    </td>
                    <td className="px-4">
                      <input
                        type="number"
                        value={row.weight}
                        onChange={(e) => updateRow(idx, 'weight', Number(e.target.value))}
                        className="bg-transparent border-b border-slate-200 p-2 w-full outline-none font-bold text-sm focus:border-black transition-all"
                      />
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          placeholder="+0"
                          className="bg-transparent border-b border-slate-200 p-2 w-full outline-none font-bold text-sm focus:border-black transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-4 last:rounded-r-2xl">
                      <button
                        onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                        className="text-slate-200 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={6}>
                    <button
                      onClick={addRow}
                      className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:border-black hover:text-black transition-all mt-4"
                    >
                      + Add Row (Fast Entry)
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkLister;
