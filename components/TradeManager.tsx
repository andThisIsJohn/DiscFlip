import React, { useState } from 'react';
import { User, TradeOffer } from '../types';

interface TradeManagerProps {
  currentUser: User;
  targetUser: User;
  onClose: () => void;
  onSubmit: (offer: Partial<TradeOffer>) => void;
}

const TradeManager: React.FC<TradeManagerProps> = ({
  currentUser,
  targetUser,
  onClose,
  onSubmit,
}) => {
  const [selectedMyDiscs, setSelectedMyDiscs] = useState<string[]>([]);
  const [selectedTheirDiscs, setSelectedTheirDiscs] = useState<string[]>([]);
  const [cashAdjustment, setCashAdjustment] = useState<number>(0);

  const toggleMyDisc = (id: string) => {
    setSelectedMyDiscs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTheirDisc = (id: string) => {
    setSelectedTheirDiscs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSendOffer = () => {
    if (selectedMyDiscs.length === 0 && selectedTheirDiscs.length === 0) return;
    onSubmit({
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: targetUser.id,
      receiverName: targetUser.name,
      senderDiscs: selectedMyDiscs,
      receiverDiscs: selectedTheirDiscs,
      cashAdjustment: cashAdjustment,
    });
  };

  // Simulation of trade inventory
  const myTradeable = currentUser.inventory || [];
  const theirTradeable = targetUser.inventory.filter((i) => i.isForTrade);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-black text-black tracking-tighter uppercase leading-none mb-1">
              Trade Negotiation
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Escrow-backed value exchange
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-4 hover:bg-white rounded-full transition-all text-slate-400 hover:text-black"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
          {/* My Side */}
          <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <img
                src={currentUser.avatar}
                className="w-12 h-12 rounded-full ring-2 ring-orange-500"
                alt=""
              />
              <h3 className="text-xl font-black uppercase tracking-tight">Your Side</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {myTradeable.length > 0 ? (
                myTradeable.map((disc) => (
                  <div
                    key={disc.id}
                    onClick={() => toggleMyDisc(disc.id)}
                    className={`relative p-3 rounded-3xl border-2 transition-all cursor-pointer ${selectedMyDiscs.includes(disc.id) ? 'border-black bg-slate-50' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                  >
                    <img
                      src={disc.imageUrl}
                      className="w-full aspect-square object-cover rounded-xl mb-2"
                      alt=""
                    />
                    <p className="text-[10px] font-black text-black uppercase truncate">
                      {disc.mold}
                    </p>
                    {selectedMyDiscs.includes(disc.id) && (
                      <div className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-center py-12 text-slate-400 text-xs font-bold uppercase italic">
                  No tradeable discs
                </p>
              )}
            </div>
          </div>

          {/* Value Balancer Center */}
          <div className="w-full md:w-64 bg-black flex flex-col items-center justify-center p-8 gap-6 text-white text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2">
                Cash Adjustment
              </span>
              <div className="flex items-center bg-slate-800 rounded-2xl p-2">
                <span className="px-3 font-black text-xl">$</span>
                <input
                  type="number"
                  value={cashAdjustment}
                  onChange={(e) => setCashAdjustment(Number(e.target.value))}
                  className="w-full bg-transparent outline-none font-black text-xl"
                />
              </div>
              <p className="text-[8px] mt-2 text-slate-500 uppercase font-black">
                Postive: You pay / Negative: They pay
              </p>
            </div>
          </div>

          {/* Their Side */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <img src={targetUser.avatar} className="w-12 h-12 rounded-full" alt="" />
              <h3 className="text-xl font-black uppercase tracking-tight">
                {targetUser.name}&apos;s side
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {theirTradeable.length > 0 ? (
                theirTradeable.map((disc) => (
                  <div
                    key={disc.id}
                    onClick={() => toggleTheirDisc(disc.id)}
                    className={`relative p-3 rounded-3xl border-2 transition-all cursor-pointer ${selectedTheirDiscs.includes(disc.id) ? 'border-orange-600 bg-orange-50' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                  >
                    <img
                      src={disc.imageUrl}
                      className="w-full aspect-square object-cover rounded-xl mb-2"
                      alt=""
                    />
                    <p className="text-[10px] font-black text-black uppercase truncate">
                      {disc.mold}
                    </p>
                    {selectedTheirDiscs.includes(disc.id) && (
                      <div className="absolute -top-2 -right-2 bg-orange-600 text-white p-1 rounded-full">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-center py-12 text-slate-400 text-xs font-bold uppercase italic">
                  All of their discs are in the bag
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50 flex justify-between items-center border-t border-slate-100">
          <div className="flex gap-12">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Your Swap
              </span>
              <span className="text-2xl font-black text-black">{selectedMyDiscs.length} Discs</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Target Swap
              </span>
              <span className="text-2xl font-black text-black">
                {selectedTheirDiscs.length} Discs
              </span>
            </div>
          </div>
          <button
            onClick={handleSendOffer}
            className="bg-black text-orange-500 px-12 py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-2xl active:scale-95"
          >
            Propose Trade
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeManager;
