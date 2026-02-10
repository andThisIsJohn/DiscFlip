
import React, { useState, useEffect } from 'react';
import { CartItem, User, ShippingOption, DiscAuction, ShippingAddress, ShippingServiceType, CombinedShippingType } from '../types';
import { db } from '../services/databaseService';
import { payments } from '../services/paymentService';

interface CheckoutProps {
    items: CartItem[];
    user: User;
    onComplete: (total: number, updatedItems: CartItem[]) => void;
    onClose: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ items, user, onComplete, onClose }) => {
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [auctions, setAuctions] = useState<Record<string, DiscAuction>>({});
    const [sellers, setSellers] = useState<Record<string, User>>({});
    
    const [selectedAddressId, setSelectedAddressId] = useState<string>(user.shippingAddresses.find(a => a.isDefault)?.id || '');
    const [showNewAddress, setShowNewAddress] = useState(false);

    const [fulfillmentChoices, setFulfillmentChoices] = useState<Record<string, {
        mode: 'shipping' | 'pickup',
        service: ShippingServiceType,
        note: string,
        insurance: boolean,
        signature: boolean
    }>>({});

    useEffect(() => {
        const fetchData = async () => {
            const allAuctions = await db.getAuctions();
            const allUsers = await db.getUsers();
            const auctionMap: Record<string, DiscAuction> = {};
            const sellerMap: Record<string, User> = {};
            const initialFulfillment: Record<string, any> = {};
            
            items.forEach(item => {
                const foundAuction = allAuctions.find(a => a.id === item.auctionId);
                const foundSeller = allUsers.find(u => u.id === item.sellerId);
                
                if (foundAuction) {
                    auctionMap[item.auctionId] = foundAuction;
                    initialFulfillment[item.auctionId] = {
                        mode: foundAuction.shippingOption === ShippingOption.PickupOnly ? 'pickup' : 'shipping',
                        service: ShippingServiceType.Standard,
                        note: '',
                        insurance: foundAuction.currentBid >= 100,
                        signature: foundAuction.currentBid >= 400
                    };
                }
                if (foundSeller) sellerMap[item.sellerId] = foundSeller;
            });
            setAuctions(auctionMap);
            setSellers(sellerMap);
            setFulfillmentChoices(initialFulfillment);
        };
        fetchData();
    }, [items]);

    const itemsBySeller: Record<string, CartItem[]> = {};
    items.forEach(item => {
        if (!itemsBySeller[item.sellerId]) itemsBySeller[item.sellerId] = [];
        itemsBySeller[item.sellerId].push(item);
    });

    const calculateShippingForSeller = (sellerId: string) => {
        const sellerItems = itemsBySeller[sellerId];
        const seller = sellers[sellerId];
        if (!seller || !sellerItems.length) return 0;

        const shippingItems = sellerItems.filter(item => fulfillmentChoices[item.auctionId]?.mode === 'shipping');
        if (shippingItems.length === 0) return 0;

        const config = seller.combinedShippingConfig || { type: CombinedShippingType.PerAdditional, basePrice: 5, additionalPrice: 2 };
        const sellerSubtotal = shippingItems.reduce((acc, i) => acc + i.price, 0);
        if (config.type === CombinedShippingType.FreeThreshold && config.freeThreshold && sellerSubtotal >= config.freeThreshold) return 0;

        let totalShipping = 0;
        if (config.type === CombinedShippingType.Tiers && config.tiers) {
            const sortedTiers = [...config.tiers].sort((a, b) => a.maxDiscs - b.maxDiscs);
            const tier = sortedTiers.find(t => t.maxDiscs >= shippingItems.length) || sortedTiers[sortedTiers.length - 1];
            totalShipping = tier ? tier.price : config.basePrice;
        } else {
            totalShipping = config.basePrice + (shippingItems.length - 1) * (config.additionalPrice || 0);
        }

        shippingItems.forEach(item => {
            const choice = fulfillmentChoices[item.auctionId];
            if (choice.insurance) totalShipping += item.price * 0.015;
            if (choice.signature) totalShipping += 3.50;
        });

        return totalShipping;
    };

    const subtotal = items.reduce((acc, item) => acc + item.price, 0);
    const shippingTotal = Object.keys(itemsBySeller).reduce((acc, sellerId) => acc + calculateShippingForSeller(sellerId), 0);
    const marketplaceFee = subtotal * 0.10; // 10%
    const processingFee = (subtotal + shippingTotal + marketplaceFee) * 0.029 + 0.30;
    const total = subtotal + shippingTotal + marketplaceFee + processingFee;

    const handleProcess = async () => {
        setIsProcessing(true);
        const finalItems = items.map(item => ({
            ...item,
            fulfillment: fulfillmentChoices[item.auctionId].mode,
            insuranceOpted: fulfillmentChoices[item.auctionId].insurance,
            signatureRequired: fulfillmentChoices[item.auctionId].signature
        }));

        try {
            await payments.createCheckoutSession(user.id, finalItems);
            // In a real environment, Stripe redirects. Here we simulate success.
            setTimeout(() => {
                onComplete(total, finalItems);
            }, 2500);
        } catch (e) {
            alert("Payment handshake failed. Retrying...");
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xl">
                <div className="text-center text-white p-8">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Securing Your Haul...</h2>
                    <p className="text-orange-400 animate-pulse font-black uppercase text-[10px] tracking-widest">Handshaking with Stripe Connect Vault</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-6xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-300 max-h-[90vh]">
                <div className="flex-grow p-8 md:p-14 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-6 mb-12">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${step >= i ? 'bg-black text-orange-50' : 'bg-slate-100 text-slate-400'}`}>{i}</div>
                                {i < 3 && <div className={`h-1 w-12 rounded-full ${step > i ? 'bg-black' : 'bg-slate-100'}`}></div>}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
                            <section>
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-3xl font-black text-black tracking-tight uppercase">Destination</h2>
                                    <button onClick={() => setShowNewAddress(!showNewAddress)} className="text-orange-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">Add New</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {user.shippingAddresses.map(addr => (
                                        <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-black bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                            <p className="font-bold text-sm text-black">{addr.name}</p>
                                            <p className="text-xs text-slate-500 font-medium">{addr.street}</p>
                                            <p className="text-xs text-slate-500 font-medium">{addr.city}, {addr.state} {addr.zip}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-black text-black tracking-tight uppercase mb-8">Shipping & Protection</h2>
                                <div className="space-y-12">
                                    {Object.entries(itemsBySeller).map(([sellerId, sellerItems]) => {
                                        const seller = sellers[sellerId];
                                        return (
                                            <div key={sellerId} className="space-y-4">
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4">From {seller?.name}</h3>
                                                <div className="space-y-4">
                                                    {sellerItems.map(item => {
                                                        const auction = auctions[item.auctionId];
                                                        const choice = fulfillmentChoices[item.auctionId];
                                                        if (!auction || !choice) return null;
                                                        return (
                                                            <div key={item.auctionId} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100">
                                                                <div className="flex items-center gap-4 mb-8">
                                                                    <img src={item.imageUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                                                                    <div>
                                                                        <h4 className="font-black text-black text-sm uppercase">{item.title}</h4>
                                                                        <p className="text-lg font-black text-orange-600">${item.price}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                    <div className="space-y-4">
                                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Delivery Mode</label>
                                                                        <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
                                                                            <button onClick={() => setFulfillmentChoices({...fulfillmentChoices, [item.auctionId]: {...choice, mode: 'shipping'}})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${choice.mode === 'shipping' ? 'bg-black text-white' : 'text-slate-400'}`}>Shipping</button>
                                                                            {auction.shippingOption !== ShippingOption.ShippingOnly && <button onClick={() => setFulfillmentChoices({...fulfillmentChoices, [item.auctionId]: {...choice, mode: 'pickup'}})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${choice.mode === 'pickup' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>Pickup</button>}
                                                                        </div>
                                                                    </div>

                                                                    {choice.mode === 'shipping' && (
                                                                        <div className="space-y-4">
                                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">High-Value Protection</label>
                                                                            <div className="flex flex-col gap-3">
                                                                                <label className={`flex items-center justify-between p-4 bg-white rounded-2xl border transition-all ${choice.insurance ? 'border-orange-500 ring-1 ring-orange-50' : 'border-slate-200'}`}>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-black uppercase text-slate-800">Add Insurance</span>
                                                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Covers lost/damaged hauls (+${(item.price * 0.015).toFixed(2)})</span>
                                                                                    </div>
                                                                                    <input type="checkbox" checked={choice.insurance} onChange={e => setFulfillmentChoices({...fulfillmentChoices, [item.auctionId]: {...choice, insurance: e.target.checked}})} className="w-5 h-5 accent-orange-600" />
                                                                                </label>
                                                                                <label className={`flex items-center justify-between p-4 bg-white rounded-2xl border transition-all ${choice.signature ? 'border-orange-500 ring-1 ring-orange-50' : 'border-slate-200'} ${item.price >= 400 ? 'opacity-70 pointer-events-none' : ''}`}>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-black uppercase text-slate-800">Signature Required</span>
                                                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Added theft protection (+ $3.50)</span>
                                                                                    </div>
                                                                                    <input type="checkbox" disabled={item.price >= 400} checked={choice.signature || item.price >= 400} onChange={e => setFulfillmentChoices({...fulfillmentChoices, [item.auctionId]: {...choice, signature: e.target.checked}})} className="w-5 h-5 accent-orange-600" />
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <button disabled={!selectedAddressId} onClick={() => setStep(2)} className="w-full bg-black text-orange-50 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all disabled:opacity-30">Continue to Payment</button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
                            <h2 className="text-3xl font-black text-black tracking-tight uppercase">Payment Vault</h2>
                            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                                <div className="p-8 rounded-[32px] border-2 border-orange-600 bg-white shadow-xl flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-orange-500 font-black text-lg">S</div>
                                        <div><p className="font-black text-black uppercase text-sm">Stripe Hosted Checkout</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cards, Apple Pay, Google Pay</p></div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border-2 border-orange-600 flex items-center justify-center"><div className="w-3 h-3 bg-orange-600 rounded-full"></div></div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Back</button>
                                <button onClick={() => setStep(3)} className="flex-[2] bg-black text-orange-50 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl">Review Secured Order</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
                            <div><h2 className="text-3xl font-black text-black tracking-tight uppercase mb-2">Review Haul</h2><p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Final confirmation before Stripe redirection</p></div>
                            <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 space-y-6">
                                <div className="flex justify-between font-black uppercase text-[10px] tracking-widest"><span className="text-slate-400">Items Subtotal</span><span className="text-black">${subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between font-black uppercase text-[10px] tracking-widest"><span className="text-slate-400">Marketplace Fee (10%)</span><span className="text-black">${marketplaceFee.toFixed(2)}</span></div>
                                <div className="flex justify-between font-black uppercase text-[10px] tracking-widest"><span className="text-slate-400">Logistics & Protection</span><span className="text-black">${shippingTotal.toFixed(2)}</span></div>
                                <div className="flex justify-between font-black uppercase text-[10px] tracking-widest"><span className="text-slate-400">Payment Processing</span><span className="text-black">${processingFee.toFixed(2)}</span></div>
                                <div className="pt-6 border-t border-slate-200 flex justify-between items-center"><span className="text-xl font-black text-black uppercase tracking-tighter">Total Due</span><span className="text-4xl font-black text-orange-600 tracking-tighter">${total.toFixed(2)}</span></div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setStep(2)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Back</button>
                                <button onClick={handleProcess} className="flex-[2] bg-orange-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl active:scale-95">Initiate Payment</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-[450px] bg-slate-50 p-10 md:p-14 border-l border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-10"><h3 className="font-black text-black uppercase tracking-widest text-xs">Summary</h3><button onClick={onClose} className="text-slate-300 hover:text-black p-2 hover:bg-white rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                    <div className="space-y-6 flex-grow overflow-y-auto custom-scrollbar pr-4 mb-10">
                        {items.map(item => (
                            <div key={item.auctionId} className="flex gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <img src={item.imageUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                                <div>
                                    <p className="text-sm font-black text-black uppercase truncate">{item.title}</p>
                                    <p className="text-xs font-black text-orange-600">${item.price}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
