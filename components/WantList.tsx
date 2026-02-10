
import React, { useState, useEffect } from 'react';
import { Bounty, User } from '../types';
import { db } from '../services/databaseService';

interface WantListProps {
    currentUser: User;
    onFulfill: (entry: Bounty) => void;
}

const WantList: React.FC<WantListProps> = ({ currentUser, onFulfill }) => {
    const [entries, setEntries] = useState<Bounty[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newEntry, setNewEntry] = useState({
        brand: '',
        mold: '',
        weightMin: 173,
        weightMax: 175,
        priceOffer: 20,
        colorPreference: ''
    });

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        // Updated to use the correct method name from databaseService.ts
        const list = await db.getBounties();
        setEntries(list.filter(e => e.status === 'Open'));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        // Updated to use the correct method name from databaseService.ts
        await db.saveBounty({
            ...newEntry,
            buyerId: currentUser.id,
            buyerName: currentUser.name
        });
        setNewEntry({ brand: '', mold: '', weightMin: 173, weightMax: 175, priceOffer: 20, colorPreference: '' });
        setIsCreating(false);
        loadEntries();
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="text-5xl font-black text-black tracking-tight mb-4">Want List</h2>
                    <p className="text-slate-500 font-medium text-xl max-w-xl italic">Post your bounties. Sellers with the right plastic will find you.</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-black text-orange-500 px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl active:scale-95"
                >
                    Post Bounty
                </button>
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handleCreate} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-lg space-y-6">
                        <h3 className="text-3xl font-black uppercase tracking-tight mb-4">Post a Bounty</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Brand</label>
                                <input value={newEntry.brand} onChange={e => setNewEntry({...newEntry, brand: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Innova..." />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mold</label>
                                <input value={newEntry.mold} onChange={e => setNewEntry({...newEntry, mold: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Firebird..." />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Wt</label>
                                    <input type="number" value={newEntry.weightMin} onChange={e => setNewEntry({...newEntry, weightMin: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Wt</label>
                                    <input type="number" value={newEntry.weightMax} onChange={e => setNewEntry({...newEntry, weightMax: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Will Pay ($)</label>
                                <input type="number" value={newEntry.priceOffer} onChange={e => setNewEntry({...newEntry, priceOffer: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Color/Special Notes</label>
                            <input value={newEntry.colorPreference} onChange={e => setNewEntry({...newEntry, colorPreference: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Pink Star only..." />
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 text-slate-400 font-black uppercase">Cancel</button>
                            <button type="submit" className="flex-1 bg-black text-orange-500 py-4 rounded-2xl font-black uppercase">Post Bounty</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {entries.length > 0 ? (
                    entries.map(entry => (
                        <div key={entry.id} className="bg-white border border-slate-200 rounded-[32px] p-8 hover:shadow-2xl transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 block">{entry.brand}</span>
                                    <h4 className="text-3xl font-black text-black tracking-tight">{entry.mold}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Bounty</p>
                                    <p className="text-3xl font-black text-black">${entry.priceOffer}</p>
                                </div>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                                    <span className="bg-slate-100 px-3 py-1 rounded-xl text-black">{`${entry.weightMin}-${entry.weightMax}g`}</span>
                                    {entry.colorPreference && <span className="bg-orange-50 px-3 py-1 rounded-xl text-orange-700">{entry.colorPreference}</span>}
                                </div>
                                <p className="text-xs text-slate-400">Posted by <span className="text-black font-black uppercase">{entry.buyerName}</span></p>
                            </div>
                            {entry.buyerId !== currentUser.id && (
                                <button 
                                    onClick={() => onFulfill(entry)}
                                    className="w-full bg-slate-50 text-black py-4 rounded-2xl font-black uppercase tracking-widest group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm"
                                >
                                    Fulfill Bounty
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-black uppercase tracking-widest">No active bounties. Be the first to post!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WantList;
