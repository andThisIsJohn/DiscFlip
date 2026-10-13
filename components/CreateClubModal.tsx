import React, { useState } from 'react';
import { User, DiscClub } from '../types';
import { db } from '../services/databaseService';

interface CreateClubModalProps {
  currentUser: User;
  onClose: () => void;
  onComplete: (clubId: string) => void;
}

const CreateClubModal: React.FC<CreateClubModalProps> = ({ currentUser, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<Partial<DiscClub>>({
    name: '',
    location: currentUser.location || '',
    description: '',
    logo: '',
  });

  const handleLogoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setForm({ ...form, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const newId = await db.createClub(currentUser.id, form);
      onComplete(newId);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight uppercase">
              Launch Community
            </h2>
            <div className="flex gap-1 mt-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1 w-12 rounded-full ${step >= i ? 'bg-orange-600' : 'bg-slate-200'}`}
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

        <div className="p-12 overflow-y-auto custom-scrollbar flex-grow">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex flex-col items-center mb-10">
                <div
                  onClick={handleLogoUpload}
                  className="w-32 h-32 rounded-[32px] bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden group"
                >
                  {form.logo ? (
                    <img src={form.logo} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <svg
                        className="w-8 h-8 text-slate-300 mb-2 group-hover:text-orange-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-[8px] font-black uppercase text-slate-400">
                        Add Shield
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">
                  Club Branding
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Club Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Windy City Aces"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Base of Operations
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="City, State"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Club Charter / Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[32px] font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="What is this club about? E.g. local tags, course maintenance, or specialized collections."
                />
              </div>

              <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                <h4 className="text-xs font-black text-orange-900 uppercase tracking-tight mb-2">
                  Ownership Protocols
                </h4>
                <ul className="space-y-2 opacity-80">
                  <li className="text-[9px] font-bold uppercase flex gap-2">
                    <span className="text-orange-600">✔</span> Creator becomes permanent owner
                  </li>
                  <li className="text-[9px] font-bold uppercase flex gap-2">
                    <span className="text-orange-600">✔</span> Owner approval required for member
                    listings
                  </li>
                  <li className="text-[9px] font-bold uppercase flex gap-2">
                    <span className="text-orange-600">✔</span> One-time setup of community vault
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-black transition-all"
          >
            {step === 1 ? 'Discard' : 'Back'}
          </button>
          <button
            onClick={step === 1 ? () => setStep(2) : handleCreate}
            disabled={isCreating || !form.name}
            className="flex-[2] bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95 disabled:opacity-30"
          >
            {isCreating ? 'Finalizing...' : step === 1 ? 'Charter Details' : 'Launch Club'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClubModal;
