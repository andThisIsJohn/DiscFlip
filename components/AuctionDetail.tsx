
import React, { useState, useEffect } from 'react';
import { DiscAuction, AuctionType, User, ReportTargetType, SellerPerformance } from '../types';
import { db } from '../services/databaseService';
import SafetyMenu from './SafetyMenu';

interface AuctionDetailProps {
    auction: DiscAuction;
    onClose: () => void;
    onPlaceBid: (auctionId: string, amount: number) => void;
    onBuyNow: (auction: DiscAuction) => void;
    onViewProfile: (userId: string) => void;
    currentUser: User;
    onMessageSeller: (auction: DiscAuction) => void;
}

const AuctionDetail: React.FC<AuctionDetailProps> = ({ auction, onClose, onPlaceBid, onBuyNow, onViewProfile, currentUser, onMessageSeller }) => {
    const [bidAmount, setBidAmount] = useState<number>((auction.currentBid || 0) + (auction.bidIncrement || 1));
    const [activeImage, setActiveImage] = useState(auction.imageUrl);
    const [timeLeft, setTimeLeft] = useState<number>(auction.endTime - Date.now());
    const [riskSignals, setRiskSignals] = useState<string[]>([]);
    const [canMessage, setCanMessage] = useState(true);
    const [perf, setPerf] = useState<SellerPerformance | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const diff = auction.endTime - Date.now();
            setTimeLeft(diff);
            if (diff <= 0) clearInterval(timer);
        }, 1000);
        
        db.getRiskSignals(auction.sellerId).then(setRiskSignals);
        db.verifyActiveInterest(currentUser.id, auction.sellerId, auction.id).then(setCanMessage);
        db.calculateSellerPerformance(auction.sellerId).then(setPerf);

        return () => clearInterval(timer);
    }, [auction.endTime, auction.sellerId, currentUser.id, auction.id]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return "ENDED";
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h > 0 ? h + 'H ' : ''}${m}M ${s}S`;
    };

    const isCrunchTime = timeLeft > 0 && timeLeft < 120000;

    const allImages = [
        auction.imageUrl, 
        auction.rimImage, 
        auction.profileImage, 
        auction.weightPhoto, 
        ...(auction.additionalImages || [])
    ].filter(Boolean) as string[];

    const handleMsgRequest = () => {
        if (!canMessage) {
            alert("Messaging restricted: You must watch the item or place a bid before you can start a discussion with the seller.");
            return;
        }
        onMessageSeller(auction);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-500">
                
                {/* Visual Side */}
                <div className="w-full md:w-5/12 bg-slate-100 flex flex-col relative border-r border-slate-100">
                    <div className="flex-grow flex items-center justify-center bg-white p-6 overflow-hidden">
                        <img src={activeImage} className="max-w-full max-h-full object-contain hover:scale-110 transition-transform duration-700" alt={auction.title} />
                    </div>
                    <div className="p-6 bg-slate-50 flex gap-2 justify-center overflow-x-auto no-scrollbar">
                        {allImages.map((img, i) => (
                            <button key={i} onClick={() => setActiveImage(img)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeImage === img ? 'border-orange-600 scale-105 shadow-lg' : 'border-transparent'}`}>
                                <img src={img} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                    
                    {auction.antiSnipe && (
                        <div className="absolute top-8 left-8 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                            Anti-Snipe Active
                        </div>
                    )}
                </div>

                {/* Data Side */}
                <div className="flex-grow p-10 md:p-14 overflow-y-auto bg-white custom-scrollbar">
                    {/* Risk Banners */}
                    {riskSignals.length > 0 && (
                        <div className="mb-8 space-y-2">
                            {riskSignals.includes('new_seller') && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                                    <span className="text-xl">🆕</span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">New Seller - Limited History</p>
                                        <p className="text-[9px] text-amber-600 font-medium leading-tight">This hunter joined recently. Proceed with standard caution.</p>
                                    </div>
                                </div>
                            )}
                            {riskSignals.includes('unverified_identity') && (
                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3">
                                    <span className="text-xl">🆔</span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-orange-800 uppercase tracking-tight">Unverified Payout Identity</p>
                                        <p className="text-[9px] text-orange-600 font-medium leading-tight">Seller hasn't completed full identity verification yet.</p>
                                    </div>
                                </div>
                            )}
                            {riskSignals.includes('high_dispute_rate') && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3">
                                    <span className="text-xl">🚨</span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-red-800 uppercase tracking-tight">High Pattern of Disputes</p>
                                        <p className="text-[9px] text-red-600 font-medium leading-tight">System alert: Above-average report volume for this seller.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-12">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] mb-2 block">{auction.brand} • {auction.run}</span>
                                <h1 className="text-4xl font-black text-black tracking-tighter leading-none mb-4">{auction.title}</h1>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase rounded-lg">{auction.category}</span>
                                    <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase rounded-lg">{auction.plastic} • {auction.weight}g</span>
                                    <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase rounded-lg">Dome: {auction.dome}</span>
                                </div>

                                {/* Trust Badges */}
                                <div className="flex flex-wrap gap-2">
                                    {perf?.badges.map(badge => (
                                        <span key={badge} className="px-2 py-1 bg-black text-orange-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-400/20 shadow-sm flex items-center gap-1">
                                            {badge === 'Fast Shipper' ? '⚡' : badge === 'Tracking Always' ? '📍' : '🛡️'} {badge}
                                        </span>
                                    ))}
                                    {auction.verificationTier === 'Fully Verified' && (
                                        <span className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13zM7 13a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>
                                            Verified Run
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <SafetyMenu 
                                    targetUser={{ id: auction.sellerId, name: auction.seller }}
                                    targetType={ReportTargetType.Listing}
                                    targetId={auction.id}
                                    currentUser={currentUser}
                                    contextSnapshot={{
                                        title: auction.title,
                                        brand: auction.brand,
                                        seller: auction.seller,
                                        imageUrl: auction.imageUrl,
                                        currentBid: auction.currentBid
                                    }}
                                    onActionComplete={onClose}
                                />
                                <button onClick={onClose} className="text-slate-300 hover:text-black transition-colors p-3"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mb-6">
                            <button 
                                onClick={handleMsgRequest}
                                className={`flex items-center gap-2 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    canMessage 
                                    ? 'bg-slate-100 text-black hover:bg-black hover:text-orange-500' 
                                    : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {canMessage ? 'Message Seller' : 'Discuss (Locked)'}
                            </button>
                            {!canMessage && (
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Watch or Bid to unlock DMs</p>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium italic border-l-4 border-slate-100 pl-4">"{auction.description}"</p>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div className="bg-black p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Current High Offer</span>
                            <div className="text-5xl font-black mb-6">${auction.currentBid}</div>
                            {auction.status === 'active' && (
                                <div className="flex gap-2">
                                    <input type="number" step={auction.bidIncrement} value={bidAmount} onChange={e => setBidAmount(Number(e.target.value))} className="w-full bg-white/10 border-none p-3 rounded-xl font-black text-white text-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <button onClick={() => onPlaceBid(auction.id, bidAmount)} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 active:scale-95 transition-all">Bid</button>
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 flex flex-col justify-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ends In</span>
                            <div className={`text-3xl font-black tracking-tighter ${isCrunchTime ? 'text-orange-600 animate-pulse' : 'text-black'}`}>{formatTime(timeLeft)}</div>
                            <p className="text-[9px] font-black text-slate-300 uppercase mt-2">{auction.bidCount} Bids Placed</p>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {/* Condition Forensics Section */}
                        <div className="bg-orange-50/50 p-8 rounded-[40px] border border-orange-100">
                             <h4 className="text-xs font-black text-orange-900 uppercase tracking-[0.2em] mb-6">Condition Forensics • {auction.condition}/10</h4>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Scuffs', value: auction.scuffs },
                                    { label: 'Gouges', value: auction.gouges },
                                    { label: 'Warping', value: auction.warping },
                                    { label: 'Ink', value: auction.hasInk ? `${auction.inkHeavy} (${auction.inkLocation})` : 'None' }
                                ].map(stat => (
                                    <div key={stat.label}>
                                        <span className="text-[9px] font-black text-orange-400 uppercase block mb-1">{stat.label}</span>
                                        <span className="text-xs font-black text-black uppercase">{stat.value}</span>
                                    </div>
                                ))}
                             </div>
                        </div>

                        {/* Technical Specs Section */}
                        <div>
                             <h4 className="text-xs font-black text-black uppercase tracking-[0.2em] mb-6">Flight Dynamics</h4>
                             <div className="grid grid-cols-4 gap-4 mb-8">
                                {[
                                    { l: 'SPD', v: auction.flightNumbers?.speed },
                                    { l: 'GLD', v: auction.flightNumbers?.glide },
                                    { l: 'TRN', v: auction.flightNumbers?.turn },
                                    { l: 'FDE', v: auction.flightNumbers?.fade }
                                ].map(f => (
                                    <div key={f.l} className="bg-slate-100 p-3 rounded-2xl text-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase block">{f.l}</span>
                                        <span className="text-lg font-black text-black">{f.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuctionDetail;
