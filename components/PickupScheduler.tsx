import React, { useState } from 'react';
import { DiscAuction, PickupDetails } from '../types';

interface PickupSchedulerProps {
  auction: DiscAuction;
  onClose: () => void;
  onSubmit: (details: Partial<PickupDetails>) => void;
}

const COURSES = [
  'Hornets Nest Park',
  'Kilborne Park',
  'Renny Gold',
  'Winthrop Gold',
  'Nevin Park',
  'Custom Address...',
];

const PickupScheduler: React.FC<PickupSchedulerProps> = ({ auction, onClose, onSubmit }) => {
  const [location, setLocation] = useState(COURSES[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [shareLocation] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      location: location === 'Custom Address...' ? customLocation : location,
      timeWindow,
      shareLocation,
    });
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight uppercase">
              Local Meetup
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Order Haul Hand-off • #{auction.id.toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full">
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

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
              1. Where to meet?
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {COURSES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLocation(c)}
                  className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase text-left transition-all ${location === c ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            {location === 'Custom Address...' && (
              <input
                required
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Enter specific location/address"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500"
              />
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
              2. Suggested Time Window
            </label>
            <input
              required
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              placeholder="e.g. Sat afternoon, 2-4 PM"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="bg-orange-900 p-8 rounded-[40px] text-white">
            <h4 className="text-sm font-black uppercase tracking-tight mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Meetup Safety Checklist
            </h4>
            <div className="space-y-3 opacity-80">
              {[
                'Meet in a high-traffic public place',
                'Daylight hours are recommended',
                'Bring a friend if possible',
                'Trust your gut - cancel if unsafe',
              ].map((tip) => (
                <div key={tip} className="flex gap-3 text-[10px] font-black uppercase">
                  <span className="text-orange-500">✔</span>
                  {tip}
                </div>
              ))}
            </div>
            <label className="mt-6 flex items-center gap-3 cursor-pointer p-3 bg-white/10 rounded-2xl border border-white/20">
              <input
                type="checkbox"
                checked={safetyChecked}
                onChange={(e) => setSafetyChecked(e.target.checked)}
                className="w-5 h-5 accent-orange-500"
              />
              <span className="text-[9px] font-black uppercase">
                I will follow safety protocols
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              disabled={!safetyChecked || !timeWindow}
              type="submit"
              className="flex-[2] bg-black text-orange-500 py-4 rounded-[24px] font-black uppercase tracking-widest shadow-xl disabled:opacity-30"
            >
              Confirm Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PickupScheduler;
