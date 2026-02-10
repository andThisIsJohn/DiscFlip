
import React, { useState, useEffect } from 'react';
import { 
    DiscCondition, AuctionType, GlowLevel, SwirlLevel, 
    User, DiscAuction, DomeType, StampType, PlasticFeel, FlightOffset, ShippingOption, DiscLocation
} from '../types';
import { analyzeDiscImage } from '../services/geminiService';
import { db } from '../services/databaseService';

interface CreateAuctionProps {
    onClose: () => void;
    onSubmit: (auction: Partial<DiscAuction>) => void;
    currentUser: User;
}

const CreateAuction: React.FC<CreateAuctionProps> = ({ onClose, onSubmit, currentUser }) => {
    const [step, setStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);
    
    // Fix: Removed 'secondaryColor', 'combinedShipping', 'isFreeShipping', 'localPickupInstructions', 'autographDetails', 'toolingNotes', and 'plhNote'
    // as they do not exist on DiscAuction type.
    const [form, setForm] = useState<Partial<DiscAuction>>({
        title: '',
        brand: '',
        mold: '',
        category: 'Distance Driver',
        plastic: '',
        weight: 175,
        color: '',
        condition: 10,
        hasInk: false,
        inkLocation: 'none',
        inkHeavy: 'none',
        scuffs: 'none',
        gouges: 'none',
        warping: 'none',
        wearHistory: 'bag_kept',
        description: '',
        type: AuctionType.Standard,
        startPrice: 15,
        buyNowPrice: undefined,
        duration: 3,
        antiSnipe: true,
        autoRelist: false,
        shippingPrice: 5,
        shippingCost: 5,
        shippingOption: ShippingOption.Both,
        shippingMethod: 'shipping',
        handlingTime: 2,
        trackingIncluded: true,
        // Fix: Use DiscLocation enum instead of string from currentUser.location
        // and assign address string to physicalLocation property
        location: DiscLocation.Vault,
        physicalLocation: currentUser.location || '',
        flightNumbers: { speed: 9, glide: 5, turn: -1, fade: 2 },
        flightOffset: FlightOffset.TrueToNumbers,
        flex: 3,
        dome: DomeType.Medium,
        glow: GlowLevel.None,
        swirl: SwirlLevel.None,
        feelTags: [],
        run: 'Stock',
        stampType: StampType.Stock,
        foilColor: '',
        smokeFree: true,
        petFree: true,
        returnPolicy: 'none',
        tradeAccepted: false,
        isRarity: false,
        rarityTags: [],
        isAutographed: false,
        additionalImages: [],
    });

    const [photos, setPhotos] = useState<{
        main: string;
        bottom: string;
        rim: string;
        profile: string;
        weightProof: string;
    }>({ main: '', bottom: '', rim: '', profile: '', weightProof: '' });

    // Trust check for high-value listings
    useEffect(() => {
        const checkRestricted = async () => {
            const risk = await db.getRiskSignals(currentUser.id);
            const isUnverified = risk.includes('unverified_identity');
            const isNew = risk.includes('new_seller');
            
            // Limit to $100 for unverified or new accounts
            if ((isUnverified || isNew) && (form.startPrice || 0) > 100) {
                setIsRestricted(true);
            } else if ((isUnverified || isNew) && (form.buyNowPrice || 0) > 150) {
                setIsRestricted(true);
            } else {
                setIsRestricted(false);
            }
        };
        checkRestricted();
    }, [form.startPrice, form.buyNowPrice, currentUser.id]);

    // Auto-generate title
    useEffect(() => {
        if (form.brand || form.plastic || form.mold || form.weight) {
            const newTitle = `${form.brand} ${form.plastic} ${form.mold} (${form.weight}g)`.trim();
            setForm(prev => ({ ...prev, title: newTitle }));
        }
    }, [form.brand, form.plastic, form.mold, form.weight]);

    const handlePhotoUpload = (slot: keyof typeof photos) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                setPhotos(prev => ({ ...prev, [slot]: base64 }));
                
                if (slot === 'main') {
                    setIsAnalyzing(true);
                    const analysis = await analyzeDiscImage(base64.split(',')[1]);
                    if (analysis) {
                        setForm(prev => ({
                            ...prev,
                            brand: analysis.brand || prev.brand,
                            mold: analysis.mold || prev.mold,
                            plastic: analysis.plastic || prev.plastic,
                            flightNumbers: analysis.flightNumbers || prev.flightNumbers,
                            description: analysis.description || prev.description,
                            run: analysis.run || prev.run,
                            foilColor: analysis.foilColor || prev.foilColor,
                            category: analysis.flightNumbers?.speed > 9 ? 'Distance Driver' : analysis.flightNumbers?.speed > 6 ? 'Fairway Driver' : 'Midrange'
                        }));
                    }
                    setIsAnalyzing(false);
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const handleFinalSubmit = () => {
        if (isRestricted) {
            alert("This listing exceeds the $100 safety limit for unverified or new accounts. Please complete Identity Verification to list high-value items.");
            return;
        }
        const submission = {
            ...form,
            imageUrl: photos.main,
            rimImage: photos.rim,
            profileImage: photos.profile,
            weightPhoto: photos.weightProof,
            additionalImages: [photos.bottom].filter(Boolean) as string[],
        };
        onSubmit(submission);
    };

    const renderStep = () => {
        switch(step) {
            case 1: return (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => handlePhotoUpload('main')} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all group overflow-hidden relative">
                            {photos.main ? (
                                <img src={photos.main} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-4">
                                    <svg className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[10px] font-black uppercase text-slate-400">Stamp/Top Photo *</span>
                                </div>
                            )}
                            {isAnalyzing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest animate-pulse">AI Appraisal...</div>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['bottom', 'rim', 'profile', 'weightProof'].map((slot) => (
                                <div key={slot} onClick={() => handlePhotoUpload(slot as any)} className="aspect-square bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden">
                                    {photos[slot as keyof typeof photos] ? (
                                        <img src={photos[slot as keyof typeof photos]} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[8px] font-black uppercase text-slate-400 text-center px-1">{slot.replace('Proof', '')}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Brand</label>
                                <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm" placeholder="e.g. Innova" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Mold</label>
                                <input value={form.mold} onChange={e => setForm({...form, mold: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm" placeholder="e.g. Destroyer" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Weight (grams)</label>
                                <input type="number" value={form.weight} onChange={e => setForm({...form, weight: Number(e.target.value)})} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            );
            case 2: return (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100">
                        <label className="text-xs font-black text-orange-900 uppercase block mb-4 text-center">Condition Rating: {form.condition}/10</label>
                        <input type="range" min="1" max="10" step="0.5" value={form.condition} onChange={e => setForm({...form, condition: Number(e.target.value)})} className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 mb-6" />
                    </div>
                </div>
            );
            case 3: return (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <textarea placeholder="General condition notes or additional details..." rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-4 bg-slate-100 border-none rounded-2xl font-medium text-xs resize-none outline-none" />
                </div>
            );
            case 4: return (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    {isRestricted && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="text-[10px] font-black text-red-800 uppercase tracking-tight">Price Limit Reached</p>
                                <p className="text-[9px] text-red-600 font-medium leading-tight">Unverified accounts are capped at $100. Complete identity verification to list high-value items.</p>
                            </div>
                        </div>
                    )}
                    <div className="bg-black p-2 rounded-[24px] flex">
                        {[AuctionType.Standard, AuctionType.BuyItNow, AuctionType.Hybrid].map(t => (
                            <button key={t} onClick={() => setForm({...form, type: t})} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === t ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {(form.type !== AuctionType.BuyItNow) && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Starting Bid ($)</label>
                                <input type="number" value={form.startPrice} onChange={e => setForm({...form, startPrice: Number(e.target.value)})} className={`w-full p-4 bg-slate-100 rounded-2xl font-black text-xl ${isRestricted ? 'border-2 border-red-500' : ''}`} />
                            </div>
                        )}
                        {(form.type !== AuctionType.Standard) && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Buy It Now ($)</label>
                                <input type="number" value={form.buyNowPrice} onChange={e => setForm({...form, buyNowPrice: Number(e.target.value)})} className={`w-full p-4 bg-orange-100 rounded-2xl font-black text-xl text-orange-700 ${isRestricted ? 'border-2 border-red-500' : ''}`} placeholder="Optional" />
                            </div>
                        )}
                    </div>
                </div>
            );
            case 5: return (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-black rounded-[32px] p-6 text-white">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Buyer Protection</span>
                            <span className="text-[10px] font-black text-orange-500 uppercase">Active</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-relaxed font-medium uppercase font-black">Escrow secures funds until delivery confirmation or 72h post-delivery.</p>
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden my-8 animate-in zoom-in duration-300">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tighter uppercase leading-none mb-1">Listing Studio</h2>
                        <div className="flex gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`h-1 w-8 rounded-full transition-all duration-500 ${i <= step ? 'bg-orange-600' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-black p-2 hover:bg-white rounded-full transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {renderStep()}
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors">
                        {step === 1 ? 'Discard' : 'Back'}
                    </button>
                    <button 
                        onClick={step === 5 ? handleFinalSubmit : () => setStep(s => s + 1)}
                        disabled={(step === 1 && !photos.main) || (step === 4 && isRestricted)}
                        className="bg-black text-orange-500 px-10 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95 disabled:opacity-30"
                    >
                        {step === 5 ? 'Launch Auction' : 'Save & Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAuction;
