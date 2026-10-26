import React, { useState } from 'react';
import { DiscAuction, TrackingEvent } from '../types';
import { db } from '../services/databaseService';

interface TrackingHubProps {
  auction: DiscAuction;
  onClose: () => void;
  onUpdate: () => void;
}

const TrackingHub: React.FC<TrackingHubProps> = ({ auction, onClose, onUpdate }) => {
  const [events, setEvents] = useState<TrackingEvent[]>(auction.trackingEvents || []);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setTimeout(async () => {
      const fresh = await db.syncTrackingEvents(auction.id);
      setEvents(fresh);
      setIsSyncing(false);
      onUpdate();
    }, 1500);
  };

  const handleCopy = () => {
    if (auction.trackingNumber) {
      navigator.clipboard.writeText(auction.trackingNumber);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-black tracking-tight uppercase leading-none">
                Package Tracker
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {auction.labelCarrier} • {auction.trackingNumber}
                </p>
                <button
                  onClick={handleCopy}
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md transition-all ${copySuccess ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-black hover:text-white'}`}
                >
                  {copySuccess ? 'Copied' : 'Copy'}
                </button>
                <a
                  href={db.getCarrierDeepLink(
                    auction.labelCarrier || '',
                    auction.trackingNumber || ''
                  )}
                  target="_blank"
                  className="text-[8px] font-black uppercase px-2 py-0.5 bg-black text-orange-500 rounded-md hover:bg-orange-600 hover:text-white"
                  rel="noreferrer"
                >
                  Track on Carrier Site
                </a>
              </div>
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

        <div className="p-12 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="flex justify-between items-end mb-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              Live Timeline
            </h3>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-500 transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Events
            </button>
          </div>

          <div className="relative space-y-12">
            {/* Vertical Line */}
            <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-slate-100 rounded-full" />

            {events.length > 0 ? (
              events
                .slice()
                .reverse()
                .map((ev, i) => (
                  <div
                    key={ev.id}
                    className="relative flex gap-10 animate-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center z-10 shadow-sm transition-all ${
                        ev.type === 'scan'
                          ? 'bg-orange-600 text-white'
                          : ev.type === 'transit'
                            ? 'bg-black text-white'
                            : ev.type === 'delivery'
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {ev.type === 'scan'
                        ? '🏢'
                        : ev.type === 'transit'
                          ? '🚚'
                          : ev.type === 'delivery'
                            ? '🏠'
                            : '📝'}
                    </div>
                    <div className="pt-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
                        {new Date(ev.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {ev.location}
                      </p>
                      <h4 className="text-sm font-black text-black uppercase leading-tight">
                        {ev.message}
                      </h4>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic">
                  Waiting for first scan...
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100">
          <div className="flex gap-4">
            <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-100 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                Origin Hub
              </span>
              <span className="text-xs font-black text-black uppercase">
                {auction.physicalLocation || 'Seller Facility'}
              </span>
            </div>
            <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-100 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                Destination
              </span>
              <span className="text-xs font-black text-black uppercase">
                {auction.buyerShippingAddress?.city}, {auction.buyerShippingAddress?.state}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingHub;
