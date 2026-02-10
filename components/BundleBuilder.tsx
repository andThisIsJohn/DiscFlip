
import React, { useState } from 'react';
import { User, DiscAuction, ShopPromotion, CartItem } from '../types';

interface BundleBuilderProps {
    seller: User;
    auctions: DiscAuction[];
    onAddToCart: (item: CartItem) => void;
}

const BundleBuilder: React.FC<BundleBuilderProps> = ({ seller, auctions, onAddToCart }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const tradeable = auctions.filter(a => a.sellerId === seller.id && a.status === 'active');
    const promotions = seller.promotions || [
        { id: 'p1', type: 'shipping_discount', threshold: 2, value: 5, isActive: true },
        { id: 'p2', type: 'bundle_discount', threshold: 3, value: 10, isActive: true }
    ];

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const activePromotion = promotions.filter(p => selectedIds.length >= p.threshold).sort((a,b) => b.value - a.value)[0];
    
    const subtotal = tradeable.filter(a => selectedIds.includes(a.id)).reduce((acc, a) => acc + (a.buyNowPrice || a.currentBid), 0);

    return (
        <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
                <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h3 className="text-3xl font-black tracking-tighter uppercase mb-2">Bundle Builder</h3>
                        <p className="text-orange-400 font-bold uppercase tracking-widest text-[10px]">Build a box from {seller.name}'s shop</p>
                    </div>
                    {activePromotion && (
                        <div className="bg-orange-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-bounce shadow-xl">
                            Promotion Applied: ${activePromotion.value} Off {activePromotion.type === 'shipping_discount' ? 'Shipping' : 'Bundle'}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
                    {tradeable.map(disc => (
                        <div 
                            key={disc.id} 
                            onClick={() => toggleSelection(disc.id)}
                            className={`relative p-3 rounded-3xl border-2 transition-all cursor-pointer group ${selectedIds.includes(disc.id) ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-600'}`}
                        >
                            <img src={disc.imageUrl} className="w-full aspect-square object-cover rounded-xl mb-2" alt="" />
                            <p className="text-[10px] font-black uppercase truncate text-slate-300 mb-1">{disc.mold}</p>
                            <p className="text-xs font-black text-white">${disc.buyNowPrice || disc.currentBid}</p>
                            {selectedIds.includes(disc.id) && (
                                <div className="absolute -top-2 -right-2 bg-orange-600 text-white p-1.5 rounded-full shadow-lg">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-md rounded-[32px] p-8 border border-white/10">
                    <div className="flex gap-10 mb-6 md:mb-0">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Items Selected</span>
                            <span className="text-2xl font-black">{selectedIds.length} Discs</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Subtotal</span>
                            <span className="text-2xl font-black">${subtotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <button 
                        disabled={selectedIds.length === 0}
                        className="bg-orange-600 text-white px-12 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
                    >
                        Add Bundle to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BundleBuilder;
