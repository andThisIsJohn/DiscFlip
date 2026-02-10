
import React, { useState } from 'react';
import { Bounty, BountySubmission, User } from '../types';

interface BountySubmissionFormProps {
    bounty: Bounty;
    currentUser: User;
    onCancel: () => void;
    onSuccess: (submission: Partial<BountySubmission>) => void;
}

const BountySubmissionForm: React.FC<BountySubmissionFormProps> = ({ bounty, onCancel, onSuccess }) => {
    const [form, setForm] = useState<Partial<BountySubmission>>({
        priceProposed: bounty.priceOffer,
        notes: '',
        imageUrl: '',
        condition: 10,
        hasInk: false
    });
    const [isUploading, setIsUploading] = useState(false);

    const handlePhotoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            setIsUploading(true);
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setForm({...form, imageUrl: reader.result as string});
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="text-center">
                <h3 className="text-2xl font-black text-black uppercase tracking-tight">Claim Bounty</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Hunt for {bounty.mold}</p>
            </div>

            <div 
                onClick={handlePhotoUpload}
                className="aspect-[4/3] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative"
            >
                {form.imageUrl ? (
                    <img src={form.imageUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Upload Main Photo *</span>
                        {bounty.isVerifiedBounty && <p className="text-[8px] text-blue-600 font-black uppercase mt-2">Verified Bounty - Multi-Photo proof required after accept</p>}
                    </div>
                )}
                {isUploading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-black uppercase animate-pulse">Processing...</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Price Offer ($)</label>
                    <input type="number" value={form.priceProposed} onChange={e => setForm({...form, priceProposed: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Condition (/10)</label>
                    <select value={form.condition} onChange={e => setForm({...form, condition: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        {[10,9,8,7,6,5].map(v => <option key={v} value={v}>{v}/10</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Submission Notes</label>
                <textarea 
                    value={form.notes} 
                    onChange={e => setForm({...form, notes: e.target.value})}
                    placeholder="e.g. Scaled at 174.5g. Field tested only, no rim scuffs."
                    rows={3}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs resize-none outline-none"
                />
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={onCancel} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                <button 
                    disabled={!form.imageUrl}
                    onClick={() => onSuccess(form)} 
                    className="flex-[2] bg-black text-orange-500 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all disabled:opacity-30"
                >
                    Submit Match
                </button>
            </div>
        </div>
    );
};

export default BountySubmissionForm;
