
import React, { useState, useRef } from 'react';
import { analyzeDiscImage } from '../services/geminiService';
import { storage } from '../services/storageService';
import { DiscAuction, DiscVisibility, DiscLocation, FlightOffset, DomeType, GlowLevel, SwirlLevel, AuctionType, ShippingOption, VerificationTier, ImageSet } from '../types';

interface DiscCaptureFlowProps {
    onClose: () => void;
    onComplete: (disc: Partial<DiscAuction>) => void;
}

const DiscCaptureFlow: React.FC<DiscCaptureFlowProps> = ({ onClose, onComplete }) => {
    const [step, setStep] = useState<'photos' | 'identify' | 'details' | 'confirm'>('photos');
    const [photoStep, setPhotoStep] = useState(0);
    const [photos, setPhotos] = useState<string[]>([]);
    const [imageSets, setImageSets] = useState<ImageSet[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [aiSuggestions, setAiSuggestions] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const steps = [
        { label: 'Top / Stamp', hint: 'Center the stamp in the circle', overlay: 'circle', slot: 'main' },
        { label: 'Bottom / Tooling', hint: 'Show center nub and tooling text', overlay: 'circle', slot: 'bottom' },
        { label: 'Rim Profile', hint: 'Show the edge shape clearly', overlay: 'rect', slot: 'rim' },
        { label: 'Side Profile', hint: 'Show the dome/flatness', overlay: 'line', slot: 'profile' }
    ];

    const [discData, setDiscData] = useState<Partial<DiscAuction>>({
        brand: '',
        mold: '',
        plastic: '',
        weight: 175,
        condition: 9,
        hasInk: false,
        visibility: DiscVisibility.Public,
        location: DiscLocation.Vault,
        flightOffset: FlightOffset.TrueToNumbers,
        dome: DomeType.Medium,
        glow: GlowLevel.None,
        swirl: SwirlLevel.None,
        feelTags: [],
        run: 'Stock',
        isForTrade: false,
        verificationTier: VerificationTier.Basic,
        createdAt: Date.now()
    });

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                
                try {
                    setUploadProgress(1);
                    // PRODUCTION PIPELINE: Generate Thumb/Med/Full and upload
                    const newImageSet = await storage.processAndUploadDiscImage(
                        'session-user', 
                        base64, 
                        steps[photoStep].slot,
                        (p) => setUploadProgress(p)
                    );
                    
                    const newPhotos = [...photos, newImageSet.full];
                    const newSets = [...imageSets, newImageSet];
                    
                    setPhotos(newPhotos);
                    setImageSets(newSets);
                    setUploadProgress(0);
                    
                    if (photoStep < steps.length - 1) {
                        setPhotoStep(photoStep + 1);
                    } else {
                        setStep('identify');
                        triggerAIAnalysis(base64); // Use original for analysis
                    }
                } catch (err: any) {
                    alert(err.message);
                    setUploadProgress(0);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerAIAnalysis = async (mainPhotoBase64: string) => {
        setIsAnalyzing(true);
        const result = await analyzeDiscImage(mainPhotoBase64.split(',')[1]);
        if (result) {
            setAiSuggestions(result);
            setDiscData(prev => ({
                ...prev,
                brand: result.brand || prev.brand,
                mold: result.mold || prev.mold,
                plastic: result.plastic || prev.plastic,
                flightNumbers: result.flightNumbers,
                condition: result.conditionEstimate || prev.condition,
                hasInk: result.hasInkVisible || prev.hasInk
            }));
        }
        setIsAnalyzing(false);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-zinc-900">
                <button onClick={onClose} className="text-white/50 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                        {step === 'photos' ? `Capture: ${steps[photoStep].label}` : 'Disc Identification'}
                    </p>
                    <div className="flex gap-1 mt-1 justify-center">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 w-4 rounded-full ${step === 'photos' && photoStep + 1 >= i ? 'bg-orange-500' : 'bg-zinc-800'}`} />
                        ))}
                    </div>
                </div>
                <div className="w-6" />
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {step === 'photos' && (
                    <div className="w-full max-w-md aspect-[3/4] rounded-[40px] border-4 border-zinc-800 relative flex flex-col items-center justify-center overflow-hidden bg-zinc-900">
                        {/* Overlay Guides */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {steps[photoStep].overlay === 'circle' && (
                                <div className="w-64 h-64 border-2 border-dashed border-orange-500/50 rounded-full" />
                            )}
                            {steps[photoStep].overlay === 'rect' && (
                                <div className="w-72 h-32 border-2 border-dashed border-orange-500/50 rounded-3xl" />
                            )}
                        </div>

                        <div className="text-center p-8 z-10">
                            <h3 className="text-xl font-black text-white uppercase mb-2">{steps[photoStep].label}</h3>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{steps[photoStep].hint}</p>
                        </div>

                        {uploadProgress > 0 ? (
                            <div className="absolute bottom-10 w-full px-12 text-center">
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-3">
                                    <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Transmitting to Vault Shield...</p>
                            </div>
                        ) : (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                            >
                                <div className="w-16 h-16 border-4 border-zinc-900 rounded-full" />
                            </button>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoCapture} />
                    </div>
                )}

                {step === 'identify' && (
                    <div className="w-full max-w-2xl bg-zinc-900 rounded-[48px] p-10 animate-in zoom-in">
                        <div className="flex gap-8 mb-10">
                            <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-orange-500/20">
                                <img src={photos[0]} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-grow">
                                {isAnalyzing ? (
                                    <div className="space-y-4">
                                        <div className="h-4 bg-zinc-800 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-8 bg-zinc-800 rounded-full w-full animate-pulse" />
                                        <p className="text-[10px] font-black text-orange-500 uppercase animate-bounce">Gemini AI is identifying...</p>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-left-4">
                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Match Found ({aiSuggestions?.confidence || 0}%)</span>
                                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">{discData.brand} {discData.mold}</h2>
                                        <p className="text-zinc-500 font-bold uppercase text-xs">{discData.plastic} Plastic • {discData.weight}g</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            <div>
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Brand</label>
                                <input value={discData.brand} onChange={e => setDiscData({...discData, brand: e.target.value})} className="w-full p-4 bg-zinc-800 rounded-2xl text-white font-bold border-none focus:ring-2 focus:ring-orange-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Mold</label>
                                <input value={discData.mold} onChange={e => setDiscData({...discData, mold: e.target.value})} className="w-full p-4 bg-zinc-800 rounded-2xl text-white font-bold border-none focus:ring-2 focus:ring-orange-500" />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => {setPhotos([]); setImageSets([]); setPhotoStep(0); setStep('photos');}} className="flex-1 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Retake All</button>
                            <button onClick={() => setStep('details')} className="flex-[2] py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-orange-500 hover:text-white transition-all">Confirm & Next</button>
                        </div>
                    </div>
                )}

                {step === 'details' && (
                    <div className="w-full max-w-2xl bg-zinc-900 rounded-[48px] p-10 animate-in slide-in-from-bottom-4">
                        <h3 className="text-xl font-black text-white uppercase mb-8">Vault Preferences</h3>
                        <div className="grid grid-cols-2 gap-6 mb-10">
                            <div>
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4 block">Organization</label>
                                <div className="flex bg-zinc-800 p-1 rounded-2xl">
                                    <button onClick={() => setDiscData({...discData, location: DiscLocation.Bag})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${discData.location === DiscLocation.Bag ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}>My Bag</button>
                                    <button onClick={() => setDiscData({...discData, location: DiscLocation.Vault})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${discData.location === DiscLocation.Vault ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>My Vault</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4 block">Visibility</label>
                                <select 
                                    value={discData.visibility} 
                                    onChange={e => setDiscData({...discData, visibility: e.target.value as any})}
                                    className="w-full p-4 bg-zinc-800 rounded-2xl text-white text-xs font-black uppercase tracking-widest outline-none"
                                >
                                    {Object.values(DiscVisibility).map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setStep('identify')} className="flex-1 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Back</button>
                            <button 
                                onClick={() => {
                                    const finalDisc = {
                                        ...discData,
                                        imageUrl: photos[0],
                                        imageSet: imageSets[0],
                                        rimImage: photos[2],
                                        profileImage: photos[3],
                                        additionalImages: [photos[1]],
                                        additionalImageSets: [imageSets[1]],
                                        title: `${discData.brand} ${discData.mold} (${discData.weight}g)`,
                                        status: 'inventory' as const,
                                        verificationTier: photos.length >= 4 ? VerificationTier.FullyVerified : VerificationTier.Basic
                                    };
                                    onComplete(finalDisc);
                                }} 
                                className="flex-[2] py-5 bg-orange-600 text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-orange-500 transition-all"
                            >
                                Add to Collection
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-zinc-900 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                {photos.map((p, i) => (
                    <div key={i} className="w-12 h-12 rounded-xl overflow-hidden border-2 border-zinc-800 flex-shrink-0">
                        <img src={p} className="w-full h-full object-cover" />
                    </div>
                ))}
                {Array.from({ length: 4 - photos.length }).map((_, i) => (
                    <div key={i} className="w-12 h-12 rounded-xl border-2 border-dashed border-zinc-800 flex-shrink-0" />
                ))}
            </div>
        </div>
    );
};

export default DiscCaptureFlow;
