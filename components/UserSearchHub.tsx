
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/databaseService';

interface UserSearchHubProps {
    currentUser: User;
    onViewUser: (userId: string) => void;
    onMessageUser: (targetUser: User) => void;
}

const UserSearchHub: React.FC<UserSearchHubProps> = ({ currentUser, onViewUser, onMessageUser }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [filters, setFilters] = useState<{
        role: 'seller' | 'buyer' | 'both',
        minRating: number,
        verifiedOnly: boolean,
        sort: 'Best Match' | 'Rating' | 'Sales' | 'Activity'
    }>({
        role: 'both',
        minRating: 0,
        verifiedOnly: false,
        sort: 'Best Match'
    });

    useEffect(() => {
        handleSearch();
    }, [query, filters, currentUser.favoriteUserIds]);

    const handleSearch = async () => {
        const found = await db.searchUsers(query, {
            role: filters.role,
            minRating: filters.minRating,
            verifiedOnly: filters.verifiedOnly
        });

        // Sorting
        const sorted = [...found].sort((a, b) => {
            // Favorited users get a slight boost in search
            const aFav = currentUser.favoriteUserIds?.includes(a.id) ? 1 : 0;
            const bFav = currentUser.favoriteUserIds?.includes(b.id) ? 1 : 0;
            if (aFav !== bFav) return bFav - aFav;

            if (filters.sort === 'Rating') return b.rating - a.rating;
            if (filters.sort === 'Sales') return b.totalSales - a.totalSales;
            if (filters.sort === 'Activity') return (b.lastActive || 0) - (a.lastActive || 0);
            return 0; // Default: Service sorts by boost
        });

        setResults(sorted);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-6xl font-black text-black tracking-tighter uppercase mb-2">Community</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Connect with elite hunters and verified vault owners.</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-grow md:w-80">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search @handle, name, PDGA#..."
                            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-200 rounded-[24px] outline-none focus:border-orange-500 font-bold text-black shadow-sm transition-all"
                        />
                        <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'both', label: 'Everyone' },
                    { id: 'seller', label: 'Sellers Only' },
                    { id: 'buyer', label: 'Buyers Only' }
                ].map(r => (
                    <button 
                        key={r.id}
                        onClick={() => setFilters({...filters, role: r.id as any})}
                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${filters.role === r.id ? 'bg-black border-black text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-black'}`}
                    >
                        {r.label}
                    </button>
                ))}
                
                <div className="h-8 w-[2px] bg-slate-200 mx-2 self-center" />

                {[4.5, 4.8, 4.9].map(r => (
                    <button 
                        key={r}
                        onClick={() => setFilters({...filters, minRating: filters.minRating === r ? 0 : r})}
                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${filters.minRating === r ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-orange-600'}`}
                    >
                        {r}+ ★
                    </button>
                ))}

                <button 
                    onClick={() => setFilters({...filters, verifiedOnly: !filters.verifiedOnly})}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${filters.verifiedOnly ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-600'}`}
                >
                    Verified Only
                </button>

                <div className="flex-grow"></div>

                <select 
                    value={filters.sort}
                    onChange={(e) => setFilters({...filters, sort: e.target.value as any})}
                    className="bg-white border-2 border-slate-100 rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                >
                    <option>Best Match</option>
                    <option>Rating</option>
                    <option>Sales</option>
                    <option>Activity</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {results.map(u => {
                    const isVIP = currentUser.favoriteUserIds?.includes(u.id);
                    return (
                        <div 
                            key={u.id}
                            onClick={() => onViewUser(u.id)}
                            className={`group bg-white border rounded-[48px] p-10 cursor-pointer hover:shadow-2xl transition-all duration-500 relative overflow-hidden flex flex-col h-full ${isVIP ? 'border-orange-400 ring-2 ring-orange-50' : 'border-slate-200 hover:border-orange-500'}`}
                        >
                            {isVIP && (
                                <div className="absolute top-0 right-0 p-6">
                                    <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                                        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                        VIP Partner
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-6 mb-8">
                                <div className="relative">
                                    <img src={u.avatar} className="w-20 h-20 rounded-[28px] object-cover ring-4 ring-slate-50 group-hover:ring-orange-100 transition-all" alt="" />
                                    {u.isIdentityVerified && (
                                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1 rounded-lg border-2 border-white shadow-lg">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-tight">{u.name}</h3>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">@{u.handle}</p>
                                    {u.pdgaNumber && <p className="text-[8px] font-black text-slate-300 uppercase mt-1">PDGA #{u.pdgaNumber}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Reputation</span>
                                    <span className="text-xs font-black text-black">{u.rating} ★ ({u.totalSales} Sales)</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Activity</span>
                                    <span className="text-xs font-black text-green-600 uppercase tracking-tighter">
                                        {u.lastActive && Date.now() - u.lastActive < 600000 ? 'Online Now' : 'Active Recently'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-10 flex-grow">
                                {u.specialtyBadges?.map(badge => (
                                    <span key={badge} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest">{badge}</span>
                                ))}
                                {u.inventoryTags?.map(tag => (
                                    <span key={tag} className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest">{tag}</span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-8 border-t border-slate-50 gap-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {u.followerCount} Followers
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onMessageUser(u); }}
                                        className="bg-black text-orange-500 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 hover:text-white transition-all shadow-xl active:scale-95"
                                        title="Message User"
                                    >
                                        <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                        Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {results.length === 0 && (
                    <div className="col-span-full py-40 text-center bg-slate-50 rounded-[64px] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No users found matching these signals.</p>
                        <button onClick={() => { setQuery(''); setFilters({role: 'both', minRating: 0, verifiedOnly: false, sort: 'Best Match'}); }} className="mt-4 text-orange-600 font-black text-[10px] uppercase underline tracking-widest">Clear All Filters</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSearchHub;
