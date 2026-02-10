
import React, { useState } from 'react';
import { DiscAuction } from '../types';

interface PickupVerificationProps {
    auction: DiscAuction;
    isSeller: boolean;
    onVerify: (pin: string) => Promise<boolean>;
    onClose: () => void;
}

const PickupVerification: React.FC<PickupVerificationProps> = ({ auction, isSeller, onVerify, onClose }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleVerify = async () => {
        setIsProcessing(true);
        setError(false);
        const success = await onVerify(pin);
        if (!success) {
            setError(true);
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 text-center">
                    <div className="w-full">
                        <h2 className="text-2xl font-black text-black tracking-tight uppercase">Exchange Verification</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Final Hand-off Authorization</p>
                    </div>
                </div>

                <div className="p-12 text-center space-y-10">
                    {isSeller ? (
                        <div className="animate-in fade-in">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">Show this code to the buyer. <br/>DO NOT hand over plastic until they verify.</p>
                            <div className="bg-slate-50 p-10 rounded-[48px] border-2 border-black inline-block relative group">
                                {/* Simulated QR Code */}
                                <div className="w-48 h-48 bg-white grid grid-cols-10 grid-rows-10 gap-0.5 p-2 shadow-inner">
                                    {Array.from({ length: 100 }).map((_, i) => (
                                        <div key={i} className={`${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'} rounded-[1px]`} />
                                    ))}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-[48px]">
                                    <p className="text-4xl font-black tracking-[0.2em] text-black">{auction.pickupDetails?.verificationPin}</p>
                                </div>
                            </div>
                            <div className="mt-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Fallback Verification PIN</p>
                                <div className="text-3xl font-black text-orange-600 tracking-[0.3em]">{auction.pickupDetails?.verificationPin}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in space-y-8">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Enter the PIN provided by the seller to finalize your haul.</p>
                            
                            <div className="relative">
                                <input 
                                    maxLength={6}
                                    value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className={`w-full text-center py-6 bg-slate-50 border-4 rounded-[32px] font-black text-5xl tracking-[0.3em] outline-none transition-all ${error ? 'border-red-500 text-red-500' : 'border-slate-100 focus:border-orange-500'}`}
                                />
                                {error && <p className="text-[9px] font-black text-red-600 uppercase mt-2">Incorrect PIN. Verify with seller.</p>}
                            </div>

                            <button 
                                onClick={handleVerify}
                                disabled={pin.length < 6 || isProcessing}
                                className="w-full bg-black text-orange-500 py-6 rounded-[28px] font-black uppercase tracking-widest text-lg shadow-xl hover:bg-orange-600 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                            >
                                {isProcessing ? 'Verifying...' : 'Finalize Exchange'}
                            </button>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-50">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">Verification instantly releases funds to the seller's vault. Only verify once you have the plastic in hand and verified its condition.</p>
                        <button onClick={onClose} className="mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-black">Dismiss</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PickupVerification;
