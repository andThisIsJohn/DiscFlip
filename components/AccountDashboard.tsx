
import React, { useState, useEffect, useRef } from 'react';
import { User, DiscAuction, TradeOffer, TradeStatus, PaymentMethod, ShippingAddress, DiscClub, BankAccount, DiscLocation, DiscVisibility, OrderStatus, RestrictionLevel } from '../types';
import { db } from '../services/databaseService';
import SellerAnalytics from './SellerAnalytics';
import BulkLister from './BulkLister';
import FulfillmentManager from './FulfillmentManager';
import AddPaymentMethodForm from './AddPaymentMethodForm';
import LinkBankForm from './LinkBankForm';
import WithdrawModal from './WithdrawModal';
import DiscCaptureFlow from './DiscCaptureFlow';
import AppealModal from './AppealModal';
import StripeOnboardingCard from './StripeOnboardingCard';

interface AccountDashboardProps {
    user: User;
    auctions: DiscAuction[];
    onUpdateUser: (user: User) => void;
    onAddFunds: () => void;
    onReload: () => void;
    onViewUser: (userId: string) => void;
    onMessageUser: (targetUser: User) => void;
}

const AccountDashboard: React.FC<AccountDashboardProps> = ({ user, auctions, onReload, onAddFunds, onUpdateUser, onViewUser, onMessageUser }) => {
    const [tab, setTab] = useState<'inventory' | 'trades' | 'analytics' | 'orders' | 'settings' | 'favorites'>('inventory');
    const [inventoryFilter, setInventoryFilter] = useState<'all' | 'bag' | 'vault' | 'trade'>('all');
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [trades, setTrades] = useState<TradeOffer[]>([]);
    const [showBulkLister, setShowBulkLister] = useState(false);
    const [showCapture, setShowCapture] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [favoriteUsers, setFavoriteUsers] = useState<User[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [restriction, setRestriction] = useState<{ level: RestrictionLevel, expires?: number }>({ level: RestrictionLevel.None });

    useEffect(() => {
        db.getTrades().then(setTrades);
        db.getEnforcementStatus(user.id).then(setRestriction);
        if (tab === 'favorites') {
            loadFavorites();
        }
        if (tab === 'settings') {
            loadBlocked();
        }
    }, [tab, user.favoriteUserIds, user.blockedUserIds, user.id]);

    const loadFavorites = async () => {
        const allUsers = await db.getUsers();
        const favs = allUsers.filter(u => user.favoriteUserIds?.includes(u.id));
        setFavoriteUsers(favs);
    };

    const loadBlocked = async () => {
        const allUsers = await db.getUsers();
        const blocked = allUsers.filter(u => user.blockedUserIds?.includes(u.id));
        setBlockedUsers(blocked);
    };

    const myInventory = user?.inventory || [];
    const filteredInventory = myInventory.filter(d => {
        if (inventoryFilter === 'bag') return d.location === DiscLocation.Bag;
        if (inventoryFilter === 'vault') return d.location === DiscLocation.Vault;
        if (inventoryFilter === 'trade') return d.isForTrade;
        return true;
    });

    const mySales = (auctions || []).filter(a => a.sellerId === user?.id && !['active', 'inventory', 'ended'].includes(a.status));
    const myPurchases = (auctions || []).filter(a => a.buyerId === user?.id && !['active', 'inventory', 'ended'].includes(a.status));

    const handleToggleDiscLocation = async (discId: string) => {
        const disc = myInventory.find(d => d.id === discId);
        if (!disc) return;
        const newLocation = disc.location === DiscLocation.Bag ? DiscLocation.Vault : DiscLocation.Bag;
        const updatedInventory = myInventory.map(d => d.id === discId ? { ...d, location: newLocation } : d);
        onUpdateUser({ ...user, inventory: updatedInventory });
    };

    const handleListForSale = (disc: DiscAuction) => {
        if (!user.stripeOnboardingComplete) {
            alert("Verification Required: You must connect your Stripe Vault before listing items for sale.");
            return;
        }
        alert(`Initiating auction for ${disc.title}. Standard listing fees apply.`);
    };

    const activeOrder = auctions.find(a => a.id === activeOrderId);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            {/* Enforcement Banners */}
            {restriction.level !== RestrictionLevel.None && (
                <div className={`mb-8 p-6 rounded-[32px] border flex items-center justify-between gap-6 shadow-xl animate-in slide-in-from-top-4 ${
                    restriction.level === RestrictionLevel.Warning ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    'bg-red-50 border-red-200 text-red-900'
                }`}>
                    <div className="flex items-center gap-6">
                        <div className="text-3xl">
                            {restriction.level === RestrictionLevel.Warning ? '⚠️' : '🚨'}
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">{restriction.level}</h3>
                            <p className="text-xs font-medium uppercase opacity-80 mt-1">
                                {restriction.level === RestrictionLevel.Warning ? 'Your account has been flagged for a rule violation. Review our safety policy.' :
                                `Restrictions active until ${new Date(restriction.expires!).toLocaleString()}.`}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowAppealModal(true)}
                        className="px-6 py-2 bg-white/50 border border-current rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all"
                    >
                        Appeal Decision
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                 <div className="lg:col-span-1 bg-black p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2">My Vault Credits</span>
                    <div className="text-4xl font-black mb-6">${(user?.balance || 0).toFixed(2)}</div>
                    <button 
                        onClick={onAddFunds} 
                        className="w-full py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        Secure Recharge
                    </button>
                 </div>

                 <div className="lg:col-span-1">
                    <StripeOnboardingCard user={user} onUpdate={onReload} />
                 </div>
                 
                 <div className="lg:col-span-2 flex justify-between items-end">
                    <div className="pl-4">
                        <h2 className="text-5xl font-black text-black tracking-tighter uppercase mb-2">Command Center</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Manage your vault and market operations</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowCapture(true)}
                            className="bg-orange-600 text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-500 transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                            Add to Vault
                        </button>
                    </div>
                 </div>
            </div>

            <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
                <div className="flex border-b border-slate-100 p-2 bg-slate-50/50 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'inventory', label: 'My Vault', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                        { id: 'orders', label: 'Orders & Sales', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
                        { id: 'favorites', label: 'VIP Partners', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                        { id: 'trades', label: 'Trade Hub', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
                        { id: 'analytics', label: 'Pro Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                        { id: 'settings', label: 'Vault Settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`flex-1 min-w-[140px] py-5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all rounded-[32px] ${
                                tab === t.id ? 'text-orange-600 bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-black'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={t.icon} /></svg>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-12">
                    {tab === 'inventory' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex bg-slate-100 p-1 rounded-2xl">
                                    {[
                                        { id: 'all', label: 'Whole Vault' },
                                        { id: 'bag', label: 'In Bag' },
                                        { id: 'vault', label: 'Display Case' },
                                        { id: 'trade', label: 'Trade Stack' }
                                    ].map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => setInventoryFilter(f.id as any)}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventoryFilter === f.id ? 'bg-white text-black shadow-sm' : 'text-slate-400'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                {filteredInventory.map((disc, idx) => (
                                    <div key={idx} className="group bg-white border border-slate-100 rounded-[40px] p-6 hover:shadow-2xl transition-all relative flex flex-col">
                                        <div className="aspect-square rounded-[32px] overflow-hidden mb-6 bg-slate-50 relative">
                                            <img src={disc.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                            <div className="absolute top-3 right-3 flex flex-col gap-2">
                                                {disc.isForTrade && <span className="bg-orange-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-lg">Tradeable</span>}
                                            </div>
                                        </div>
                                        <h4 className="font-black text-black text-xl mb-1 truncate uppercase">{disc.mold}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex-grow">{disc.brand} • {disc.plastic}</p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleToggleDiscLocation(disc.id)}
                                                className="flex-1 py-3 rounded-xl bg-slate-100 text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                                            >
                                                {disc.location === DiscLocation.Bag ? 'Move to Vault' : 'Put in Bag'}
                                            </button>
                                            <button 
                                                onClick={() => handleListForSale(disc)}
                                                className="flex-1 py-3 rounded-xl bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg"
                                            >
                                                List for Sale
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'settings' && (
                        <div className="animate-in fade-in duration-500 space-y-12">
                            <section>
                                <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Legal Vault</h3>
                                <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                        <div>
                                            <p className="text-xs font-black uppercase text-black">Protocol Terms & Conditions</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Accepted on {new Date(user.legalAcceptedAt || Date.now()).toLocaleDateString()}</p>
                                        </div>
                                        <button className="text-[9px] font-black text-orange-600 uppercase tracking-widest underline">Download PDF</button>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                        <div>
                                            <p className="text-xs font-black uppercase text-black">Marketplace Rules (The Charter)</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Version 1.0.4 • Enforced</p>
                                        </div>
                                        <button className="text-[9px] font-black text-orange-600 uppercase tracking-widest underline">Review Rules</button>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-black uppercase text-black">Privacy & PII Disclosure</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Stripe Connect Authorized</p>
                                        </div>
                                        <button className="text-[9px] font-black text-orange-600 uppercase tracking-widest underline">Manage Data</button>
                                    </div>
                                </div>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Blocked Communications</h3>
                                {blockedUsers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {blockedUsers.map(bu => (
                                            <div key={bu.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <img src={bu.avatar} className="w-10 h-10 rounded-full grayscale" />
                                                    <p className="text-xs font-black uppercase">{bu.name}</p>
                                                </div>
                                                <button 
                                                    onClick={async () => { await db.unblockUser(user.id, bu.id); onReload(); }}
                                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[8px] font-black uppercase hover:border-black transition-all"
                                                >
                                                    Unblock
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 font-black uppercase text-[10px] italic">No hunters are currently blocked.</p>
                                )}
                            </section>
                        </div>
                    )}

                    {tab === 'orders' && (
                        <div className="animate-in fade-in duration-500">
                            {activeOrderId ? (
                                <div className="space-y-6">
                                    <button 
                                        onClick={() => setActiveOrderId(null)}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                        Back to Orders
                                    </button>
                                    {activeOrder && (
                                        <FulfillmentManager 
                                            auction={activeOrder} 
                                            isSeller={activeOrder.sellerId === user.id} 
                                            onUpdate={onReload} 
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    <section>
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Discs to Ship</h3>
                                        <div className="space-y-4">
                                            {mySales.map(order => (
                                                <div 
                                                    key={order.id} 
                                                    onClick={() => setActiveOrderId(order.id)}
                                                    className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] flex items-center gap-6 cursor-pointer hover:bg-white hover:shadow-xl transition-all group"
                                                >
                                                    <img src={order.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt="" />
                                                    <div className="flex-grow">
                                                        <p className="font-black text-black text-sm uppercase leading-tight">{order.mold}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {order.status.replace('_', ' ')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="bg-black text-orange-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase group-hover:bg-orange-600 group-hover:text-white transition-colors">Manage</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Incoming Hauls</h3>
                                        <div className="space-y-4">
                                            {myPurchases.map(order => (
                                                <div 
                                                    key={order.id} 
                                                    onClick={() => setActiveOrderId(order.id)}
                                                    className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] flex items-center gap-6 cursor-pointer hover:bg-white hover:shadow-xl transition-all group"
                                                >
                                                    <img src={order.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt="" />
                                                    <div className="flex-grow">
                                                        <p className="font-black text-black text-sm uppercase leading-tight">{order.mold}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {order.status.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Other tabs handled here... */}
                </div>
            </div>

            {showCapture && (
                <DiscCaptureFlow 
                    onClose={() => setShowCapture(false)} 
                    onComplete={async (newDisc) => {
                        const updatedInventory = [...(user.inventory || []), { ...newDisc, id: Math.random().toString(36).substr(2, 9) } as DiscAuction];
                        onUpdateUser({ ...user, inventory: updatedInventory });
                        setShowCapture(false);
                        onReload();
                    }} 
                />
            )}

            {showWithdraw && (
                <WithdrawModal 
                    user={user} 
                    onClose={() => setShowWithdraw(false)} 
                    onSuccess={(amt) => { onReload(); }} 
                />
            )}
        </div>
    );
};

export default AccountDashboard;
