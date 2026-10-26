import React, { useState, useRef } from 'react';
import { User, ReportTargetType, ReportCategory, ReportStatus } from '../types';
import { db } from '../services/databaseService';

interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  contextSnapshot: any;
  currentUser: User;
  onClose: () => void;
  clubId?: string;
}

const ReportModal: React.FC<ReportModalProps> = ({
  targetType,
  targetId,
  targetOwnerId,
  contextSnapshot,
  currentUser,
  onClose,
  clubId,
}) => {
  const [step, setStep] = useState<'category' | 'details' | 'success'>('category');
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [ticketId, setTicketId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && evidence.length < 4) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEvidence((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const tktId = await db.submitReport({
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      targetType,
      targetId,
      targetOwnerId,
      category: category!,
      details,
      evidencePhotos: evidence,
      contextSnapshot,
      status: ReportStatus.Received,
      clubId,
    });
    setTicketId(tktId);
    setIsSubmitting(false);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto [align-items:safe_center]">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight">
              Report Safety Issue
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Reporting {targetType}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
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

        <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
          {step === 'category' && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                Why are you reporting this?
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(ReportCategory).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setStep('details');
                    }}
                    className="w-full text-left p-5 bg-slate-50 border-2 border-transparent hover:border-orange-500 rounded-3xl transition-all group"
                  >
                    <p className="font-black text-sm uppercase text-slate-700 group-hover:text-black">
                      {cat}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <section>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                  Provide Specific Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="Explain the situation..."
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </section>

              <section>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                  Evidence Snapshot ({evidence.length}/4)
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {evidence.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 relative group"
                    >
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setEvidence((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {evidence.length < 4 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center hover:border-orange-500 transition-all text-slate-300"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span className="text-[8px] font-black uppercase mt-1">Upload</span>
                    </button>
                  )}
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={handlePhotoAdd}
                    accept="image/*"
                  />
                </div>
              </section>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">
                  Automated Context Snapshot:
                </p>
                <div className="text-[8px] font-mono text-slate-400 bg-white p-3 rounded-xl border border-slate-100 overflow-hidden truncate">
                  ID: {targetId} | Reporter: {currentUser.id} | Timestamp: {Date.now()}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('category')}
                  className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-black transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !details}
                  className="flex-[2] bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95 disabled:opacity-30"
                >
                  {isSubmitting ? 'Transmitting...' : 'Submit Signal'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-green-100">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-black uppercase tracking-tight mb-4">
                Signal Received
              </h2>
              <p className="text-slate-500 font-medium uppercase text-[10px] leading-relaxed mb-10 tracking-widest max-w-sm mx-auto">
                Thanks—your report was received. Our safety protocol is now active. We may contact
                you if additional forensics are needed.
              </p>
              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mb-10 inline-block">
                <span className="text-[10px] text-slate-400 font-black uppercase block mb-1">
                  Ticket ID
                </span>
                <span className="text-xl font-black text-black tracking-widest">{ticketId}</span>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl"
              >
                Return to Market
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
