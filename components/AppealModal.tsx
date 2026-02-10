
import React, { useState } from 'react';
import { User, ReportTargetType } from '../types';
import { db } from '../services/databaseService';

interface AppealModalProps {
    currentUser: User;
    onClose: () => void;
    onSuccess: () => void;
}

const AppealModal: React.FC<AppealModalProps> = ({ currentUser, onClose, onSuccess }) => {
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await db.submitAppeal(
            currentUser.id, 
            currentUser.name, 
            ReportTargetType.User, 
            currentUser.id, 
            details
        );
        setIsSubmitting(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[48px] p-12 text-center animate-in zoom-in">
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-3xl">📥</div>
                    <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-4">Appeal Lodged</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest leading-relaxed mb-10">
                        Our safety team has received your forensics. We review appeals within 24 hours. You'll receive a signal in your feed once a decision is made.
                    </p>
                    <button onClick={() => { onSuccess(); onClose(); }} className="w-full bg-black text-orange-50 py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl">Understood</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in flex flex-col max-h-[90vh]">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight leading-none">Appeal Protocol</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dispute Safety Enforcement</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                        <p className="text-[10px] font-black text-orange-800 uppercase leading-relaxed italic">
                            "Transparency is core to the vault. Please provide evidence or context that suggests the restriction was an error or misinterpretation of activity."
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Your Case Forensics</label>
                        <textarea 
                            required
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            rows={6}
                            placeholder="Explain why this restriction should be lifted..."
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discard</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !details}
                            className="flex-[2] bg-black text-orange-50 py-5 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 transition-all disabled:opacity-30"
                        >
                            {isSubmitting ? 'Transmitting...' : 'Send to Safety Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppealModal;
