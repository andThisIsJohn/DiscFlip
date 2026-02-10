
import React, { useState, useRef } from 'react';
import { DiscAuction, OrderDispute } from '../types';

interface OrderIssueModalProps {
    auction: DiscAuction;
    onClose: () => void;
    onSubmit: (dispute: OrderDispute) => void;
}

const OrderIssueModal: React.FC<OrderIssueModalProps> = ({ auction, onClose, onSubmit }) => {
    const [reason, setReason] = useState<OrderDispute['reason']>('condition_mismatch');
    const [details, setDetails] = useState('');
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [resolution, setResolution] = useState<OrderDispute['proposedResolution']>('partial_refund');
    const [evidence, setEvidence] = useState<string[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && evidence.length < 4) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setEvidence(prev => [...prev, event.target?.result as string]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            reason,
            details,
            partialRefundRequested: resolution === 'partial_refund' ? refundAmount : undefined,
            proposedResolution: resolution,
            evidencePhotos: evidence,
            status: 'open',
            timestamp: Date.now()
        });
    };

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tight uppercase">Resolution Center</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order Haul Verification • #{auction.id.toUpperCase()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                    {/* Reason Select */}
                    <section>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">1. What's the signal?</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'condition_mismatch', label: 'Condition Mismatch', icon: '🔍' },
                                { id: 'never_shipped', label: 'Never Shipped', icon: '🛑' },
                                { id: 'tracking_stuck', label: 'Tracking Stuck', icon: '⌛' },
                                { id: 'delivered_missing', label: 'Missing Haul', icon: '🏠' },
                                { id: 'shipping_damage', label: 'Damage', icon: '💥' },
                                { id: 'wrong_item', label: 'Wrong Disc', icon: '🔁' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setReason(opt.id as any)}
                                    className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase text-left transition-all flex items-center gap-3 ${reason === opt.id ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                                >
                                    <span className="text-lg">{opt.icon}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Evidence Vault */}
                    <section>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">2. Evidence Vault ({evidence.length}/4)</label>
                        <div className="grid grid-cols-4 gap-3">
                            {evidence.map((img, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden relative group border-2 border-slate-100">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => setEvidence(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                            {evidence.length < 4 && (
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:border-orange-500 transition-all group"
                                >
                                    <svg className="w-6 h-6 text-slate-300 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[8px] font-black uppercase text-slate-400 mt-1">Add Photo</span>
                                </button>
                            )}
                            <input type="file" hidden ref={fileInputRef} onChange={handlePhotoAdd} accept="image/*" />
                        </div>
                    </section>

                    {/* Resolution Choice */}
                    <section className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block">3. Proposed Resolution</label>
                         <div className="space-y-3">
                            {[
                                { id: 'partial_refund', label: 'Partial Refund (I keep the disc)', desc: 'Keep the plastic, get some vault credit back' },
                                { id: 'return_refund', label: 'Return for Full Refund', desc: 'I will send it back via prepaid label' },
                                { id: 'full_refund', label: 'Full Refund (Item Missing/Never Sent)', desc: 'Only if shipment never arrived or status is RTS' }
                            ].map(res => (
                                <button
                                    key={res.id}
                                    type="button"
                                    onClick={() => setResolution(res.id as any)}
                                    className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${resolution === res.id ? 'border-black bg-white shadow-lg' : 'border-slate-100 bg-transparent text-slate-400'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[11px] font-black uppercase ${resolution === res.id ? 'text-black' : 'text-slate-400'}`}>{res.label}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${resolution === res.id ? 'border-orange-600 bg-orange-600' : 'border-slate-200'}`}>
                                            {resolution === res.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                    </div>
                                    <p className="text-[9px] font-medium uppercase opacity-60">{res.desc}</p>
                                    
                                    {res.id === 'partial_refund' && resolution === 'partial_refund' && (
                                        <div className="mt-6 flex items-center gap-4 animate-in slide-in-from-top-2">
                                            <span className="text-[10px] font-black text-orange-600 uppercase">Refund Amount</span>
                                            <div className="bg-slate-50 px-4 py-2 rounded-xl flex items-center">
                                                <span className="font-black text-slate-400 mr-2">$</span>
                                                <input 
                                                    type="number" 
                                                    value={refundAmount} 
                                                    onChange={e => setRefundAmount(Number(e.target.value))}
                                                    className="bg-transparent border-none outline-none w-16 font-black text-black" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                         </div>
                    </section>

                    <section>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">4. Describe the Issue</label>
                        <textarea
                            required
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            rows={3}
                            className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[32px] text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Provide as much detail as possible to speed up resolution..."
                        />
                    </section>
                </form>

                <div className="p-10 border-t border-slate-50 flex gap-4 bg-white flex-shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
                    <button 
                        onClick={handleSubmit}
                        disabled={evidence.length === 0 && reason !== 'never_shipped' && reason !== 'tracking_stuck'}
                        className="flex-[2] bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30"
                    >
                        File Formal Dispute
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderIssueModal;
