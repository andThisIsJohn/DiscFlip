
import React, { useState } from 'react';
import { DiscAuction } from '../types';
import { db } from '../services/databaseService';
import { obs } from '../services/observabilityService';

interface AdminListingManagerProps {
    auctions: DiscAuction[];
    adminId: string;
}

const AdminListingManager: React.FC<AdminListingManagerProps> = ({ auctions, adminId }) => {
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const activeListings = auctions.filter(a => a.status === 'active' && !a.isHidden);
    const filtered = activeListings.filter(a => 
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.mold.toLowerCase().includes(query.toLowerCase()) ||
        a.seller.toLowerCase().includes(query.toLowerCase()) ||
        a.id === query
    );

    const handleTakedown = async (id: string) => {
        const reason = window.prompt("Reason for Nuclear Takedown:");
        if (!reason) return;
        await db.adminTakedownListing(id, adminId, reason);
        obs.log('WARN', { component: 'Admin', action: 'ListingTakedown', metadata: { id, reason } });
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex gap-4">
                <input 
                    type="text" 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search active listings by mold, brand, or seller..."
                    className="flex-grow bg-white border-2 border-slate-100 rounded-[32px] p-5 pl-10 font-bold outline-none focus:border-orange-500 shadow-sm"
                />
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-[48px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Listing</th>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Seller</th>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Price</th>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-8">
                                        <div className="flex items-center gap-6">
                                            <img src={a.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                                            <div>
                                                <p className="font-black text-black uppercase text-sm leading-tight">{a.mold}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{a.brand} • {a.plastic}</p>
                                                <p className="text-[8px] font-mono text-slate-300 mt-1 uppercase">ID: {a.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <p className="text-xs font-black uppercase text-black">{a.seller}</p>
                                        <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Level 1 Hunter</span>
                                    </td>
                                    <td className="p-8">
                                        <p className="text-sm font-black text-black">${a.currentBid}</p>
                                        <span className="text-[8px] font-black text-slate-400 uppercase">{a.bidCount} Bids</span>
                                    </td>
                                    <td className="p-8">
                                        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[8px] font-black uppercase tracking-widest">Live</span>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleTakedown(a.id)}
                                                className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                title="Nuclear Takedown"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="p-32 text-center text-slate-300 font-black uppercase tracking-[0.3em]">No target signal found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminListingManager;
