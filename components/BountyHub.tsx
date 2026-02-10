
import React, { useState, useEffect } from 'react';
import { Bounty, User, BountyType, BountyStatus, BountyVisibility, ReportTargetType } from '../types';
import { db } from '../services/databaseService';
import CreateBounty from './CreateBounty';
import BountyDetail from './BountyDetail';
import SafetyMenu from './SafetyMenu';

interface BountyHubProps {
    currentUser: User;
}

const BountyHub: React.FC<BountyHubProps> = ({ currentUser }) => {
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [view, setView] = useState<'feed' | 'mine' | 'submissions'>('feed');
    const [isCreating, setIsCreating] = useState(false);
    const [selectedBountyId, setSelectedBountyId] = useState<string | null>(null);
    const [filter, setFilter] = useState({
        type: 'All' as BountyType | 'All',
        sort: 'Newest' as 'Newest' | 'High Payout' | 'Ending Soon'
    });

    useEffect(() => {
        loadBounties();
    }, []);

    const loadBounties = async () => {
        const all = await db.getBounties();
        setBounties(all);
    };

    const filteredBounties = bounties.filter(b => {
        if (view === 'mine') return b.buyerId === currentUser.id;
        if (view === 'submissions') return b.submissions.some(s => s.sellerId === currentUser.id);
        
        if (filter.type !== 'All' && b.type !== filter.type) return false;
        return b.status === BountyStatus.Open;
    }).sort((a, b) => {
        if (filter.sort === 'High Payout') return b.priceOffer - a.priceOffer;
        if (filter.sort === 'Ending Soon') return a.expirationDate - b.expirationDate;
        return b.createdAt - a.createdAt;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-6xl font-black text-black tracking-tighter uppercase mb-2">Bounty Hub</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Hunt specific plastic. Post your most wanted rewards.</p>
                </div>
                <div className="flex bg-slate-100 p-2 rounded-[32px] w-full md:w-auto">
                    {[
                        { id: 'feed', label: 'Bounty Feed' },
                        { id: 'mine', label: 'My Bounties' },
                        { id: 'submissions', label: 'My Hunts' }
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setView(t.id as any)}
                            className={`flex-1 md:px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === t.id ? 'bg-black text-orange-500 shadow-lg' : 'text-slate-400 hover:text-black'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-orange-600 text-white px-10 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-500 transition-all active:scale-95 whitespace-nowrap"
                >
                    Post New Bounty
                </button>
            </div>

            {view === 'feed' && (
                <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                    {['All', ...Object.values(BountyType)].map(type => (
                        <button 
                            key={type}
                            onClick={() => setFilter({...filter, type: type as any})}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${filter.type === type ? 'bg-black border-black text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-black'}`}
                        >
                            {type}
                        </button>
                    ))}
                    <div className="flex-grow"></div>
                    <select 
                        value={filter.sort} 
                        onChange={e => setFilter({...filter, sort: e.target.value as any})}
                        className="bg-white border-2 border-slate-100 rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                    >
                        <option>Newest</option>
                        <option>High Payout</option>
                        <option>Ending Soon</option>
                    </select>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBounties.map(bounty => (
                    <div 
                        key={bounty.id} 
                        onClick={() => setSelectedBountyId(bounty.id)}
                        className="group bg-white border border-slate-200 rounded-[48px] p-10 cursor-pointer hover:shadow-2xl hover:border-orange-500 transition-all duration-500 relative overflow-hidden flex flex-col h-full"
                    >
                        <div className="absolute top-6 left-6 z-20" onClick={e => e.stopPropagation()}>
                            <SafetyMenu 
                                targetUser={{ id: bounty.buyerId, name: bounty.buyerName }}
                                targetType={ReportTargetType.Bounty}
                                targetId={bounty.id}
                                currentUser={currentUser}
                                contextSnapshot={{
                                    mold: bounty.mold,
                                    brand: bounty.brand,
                                    buyer: bounty.buyerName
                                }}
                                onActionComplete={loadBounties}
                                variant="minimal"
                                align="left"
                            />
                        </div>

                        <div className="flex justify-between items-start mb-8 pl-8">
                            <div>
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-2">{bounty.type}</span>
                                <h3 className="text-3xl font-black text-black tracking-tighter leading-none mb-2">{bounty.mold}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bounty.brand} • {bounty.plastic}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Reward</p>
                                <p className="text-3xl font-black text-black">${bounty.priceOffer}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Weight Req</span>
                                <span className="text-xs font-black text-black">{bounty.weightMin}-{bounty.weightMax}g</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Min Cond</span>
                                <span className="text-xs font-black text-black">{bounty.conditionMin}/10+</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                            <div className="flex items-center gap-3">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bounty.buyerName}`} className="w-8 h-8 rounded-full bg-slate-100" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{bounty.buyerName}</p>
                                    <span className="text-[8px] font-black text-orange-600">{currentUser.bountyReliabilityScore || 100}% Reliability</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <button className="bg-black text-orange-500 px-6 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all">Claim</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isCreating && (
                <CreateBounty 
                    currentUser={currentUser} 
                    onClose={() => setIsCreating(false)} 
                    onSubmit={async (b) => {
                        await db.saveBounty({ ...b, buyerId: currentUser.id, buyerName: currentUser.name });
                        setIsCreating(false);
                        loadBounties();
                    }} 
                />
            )}

            {selectedBountyId && (
                <BountyDetail 
                    bounty={bounties.find(b => b.id === selectedBountyId)!} 
                    currentUser={currentUser} 
                    onClose={() => setSelectedBountyId(null)} 
                    onReload={loadBounties}
                />
            )}
        </div>
    );
};

export default BountyHub;
