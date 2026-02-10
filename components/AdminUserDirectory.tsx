
import React, { useState } from 'react';
import { User, RestrictionLevel } from '../types';
import { db } from '../services/databaseService';
import { obs } from '../services/observabilityService';

const AdminUserDirectory: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;
        setIsLoading(true);
        const found = await db.searchUsersDetailed(query);
        setResults(found);
        setIsLoading(false);
        obs.log('INFO', { component: 'Admin', action: 'UserLookup', metadata: { query, results: found.length } });
    };

    const handleModAction = async (userId: string, action: 'warn' | 'mute' | 'freeze' | 'ban') => {
        const reason = window.prompt(`Reason for ${action}:`);
        if (!reason) return;
        
        await db.applyModerationAction(userId, action, reason, 'admin_current');
        const updated = await db.searchUsersDetailed(userId);
        if (updated.length > 0) setSelectedUser(updated[0]);
        handleSearch();
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex gap-4">
                <form onSubmit={handleSearch} className="flex-grow relative">
                    <input 
                        type="text" 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search ID, @handle, or Email Address..."
                        className="w-full bg-white border-2 border-slate-100 rounded-[32px] p-5 pl-14 font-bold text-black outline-none focus:border-orange-500 transition-all shadow-sm"
                    />
                    <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </form>
                <button 
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="bg-black text-orange-50 px-10 rounded-[32px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 transition-all active:scale-95"
                >
                    {isLoading ? 'Searching...' : 'Lookup User'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Results List */}
                <div className="lg:col-span-1 bg-white border-2 border-slate-100 rounded-[48px] overflow-hidden shadow-sm h-fit">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                        <h3 className="text-sm font-black uppercase tracking-widest">Search Results ({results.length})</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {results.map(u => (
                            <div 
                                key={u.id} 
                                onClick={() => setSelectedUser(u)}
                                className={`p-6 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-all ${selectedUser?.id === u.id ? 'bg-orange-50 border-r-4 border-orange-600' : ''}`}
                            >
                                <img src={u.avatar} className="w-12 h-12 rounded-xl" />
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase truncate text-black">{u.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">@{u.handle}</p>
                                </div>
                            </div>
                        ))}
                        {results.length === 0 && !isLoading && (
                            <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px]">No active signals</div>
                        )}
                    </div>
                </div>

                {/* Deep Dive Panel */}
                <div className="lg:col-span-2">
                    {selectedUser ? (
                        <div className="bg-white border-2 border-slate-100 rounded-[56px] overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
                            <div className="p-10 flex flex-col md:flex-row gap-10 bg-slate-50/50 border-b border-slate-100">
                                <img src={selectedUser.avatar} className="w-40 h-40 rounded-[48px] shadow-xl ring-8 ring-white" />
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h2 className="text-4xl font-black tracking-tighter uppercase">{selectedUser.name}</h2>
                                        {selectedUser.restrictionLevel !== RestrictionLevel.None && (
                                            <span className="bg-red-100 text-red-600 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-200">
                                                {selectedUser.restrictionLevel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                                        <div><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">PDGA#</span><span className="text-xs font-black">{selectedUser.pdgaNumber || 'N/A'}</span></div>
                                        <div><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Vault Credits</span><span className="text-xs font-black text-orange-600">${selectedUser.balance}</span></div>
                                        <div><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Strikes</span><span className="text-xs font-black text-red-600">{selectedUser.strikes}</span></div>
                                        <div><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Joined</span><span className="text-xs font-black">{new Date(selectedUser.joinedDate).toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                                <section>
                                    <h4 className="text-xs font-black uppercase tracking-widest mb-6 text-slate-400">Security Actions</h4>
                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => handleModAction(selectedUser.id, 'warn')} className="w-full py-4 border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase hover:border-black transition-all">Warn Hunter</button>
                                        <button onClick={() => handleModAction(selectedUser.id, 'mute')} className="w-full py-4 border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase hover:border-black transition-all">Restrict DMs</button>
                                        <button onClick={() => handleModAction(selectedUser.id, 'freeze')} className="w-full py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-orange-500">Freeze Vault (3 Days)</button>
                                        <button onClick={() => handleModAction(selectedUser.id, 'ban')} className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-red-500">Nuclear Ban (Irreversible)</button>
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-xs font-black uppercase tracking-widest mb-6 text-slate-400">Account Health</h4>
                                    <div className="bg-slate-50 p-8 rounded-3xl space-y-4 border border-slate-100">
                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Spam Score</span><span className="text-sm font-black">{selectedUser.spamScore}%</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">KYC Identity</span><span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${selectedUser.isIdentityVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedUser.isIdentityVerified ? 'Verified' : 'Unverified'}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Total Hauls</span><span className="text-sm font-black">{selectedUser.totalSales} Sales</span></div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-slate-50 rounded-[56px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-slate-200">👤</div>
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Select a hunter to view forensics</h3>
                            <p className="text-[10px] font-bold text-slate-300 uppercase mt-2 tracking-widest">Global lookup active across all regions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUserDirectory;
