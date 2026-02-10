import React, { useState, useEffect } from 'react';
import { DiscClub, DiscAuction, User, ReportTargetType, ReportStatus, UserReport, ReportCategory } from '../types';
import { db } from '../services/databaseService';
import AuctionCard from './AuctionCard';
import CreateClubModal from './CreateClubModal';

interface ClubHubProps {
    currentUser: User;
    auctions: DiscAuction[];
    onSelectAuction: (id: string) => void;
}

const ClubHub: React.FC<ClubHubProps> = ({ currentUser, auctions, onSelectAuction }) => {
    const [clubs, setClubs] = useState<DiscClub[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [adminTab, setAdminTab] = useState<'members' | 'pending_listings' | 'reports'>('members');
    const [clubReports, setClubReports] = useState<UserReport[]>([]);
    const [clubMembers, setClubMembers] = useState<User[]>([]);
    const [pendingMembers, setPendingMembers] = useState<User[]>([]);

    useEffect(() => {
        loadClubs();
    }, []);

    const loadClubs = async () => {
        const fetchedClubs = await db.getClubs();
        setClubs(fetchedClubs);
    };

    const loadAdminData = async (clubId: string) => {
        const [allReports, allUsers, currentClubs] = await Promise.all([
            db.getReports(),
            db.getUsers(),
            db.getClubs()
        ]);
        
        const club = currentClubs.find(c => c.id === clubId);
        if (club) {
            setClubReports(allReports.filter(r => r.clubId === clubId));
            setClubMembers(allUsers.filter(u => club.memberIds.includes(u.id)));
            setPendingMembers(allUsers.filter(u => club.pendingMemberIds.includes(u.id)));
        }
    };

    const handleJoinRequest = async (clubId: string) => {
        try {
            await db.requestToJoinClub(clubId, currentUser.id);
            alert("Join request sent! The club admin will review your profile.");
            loadClubs();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleApprove = async (userId: string) => {
        if (!selectedClubId) return;
        await db.approveMember(selectedClubId, userId, currentUser.id);
        await loadAdminData(selectedClubId);
        loadClubs();
    };

    const handleRemove = async (userId: string) => {
        if (!selectedClubId) return;
        try {
            await db.removeMemberFromClub(selectedClubId, userId, currentUser.id);
            await loadAdminData(selectedClubId);
            loadClubs();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const selectedClub = clubs.find(c => c.id === selectedClubId);
    const clubAuctions = auctions.filter(a => a.clubId === selectedClubId && a.status === 'active');
    
    const [pendingAuctions, setPendingAuctions] = useState<DiscAuction[]>([]);
    useEffect(() => {
        if (selectedClubId) {
            const data = localStorage.getItem('discflip_db_auctions');
            const all: DiscAuction[] = data ? JSON.parse(data) : [];
            setPendingAuctions(all.filter(a => a.clubId === selectedClubId && a.status === 'pending_club_approval'));
            loadAdminData(selectedClubId);
        }
    }, [selectedClubId]);

    const isMember = selectedClub?.memberIds.includes(currentUser.id);
    const isAdmin = selectedClub?.adminId === currentUser.id;
    const isPending = selectedClub?.pendingMemberIds.includes(currentUser.id);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            {!selectedClubId ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                        <div>
                            <h2 className="text-6xl font-black text-black tracking-tighter uppercase mb-2">Club Marketplace</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Support local clubs, get exclusive plastic.</p>
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-black text-orange-50 px-10 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                        >
                            Launch New Club
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {clubs.map(club => (
                            <div 
                                key={club.id} 
                                onClick={() => setSelectedClubId(club.id)}
                                className="group bg-white border border-slate-200 rounded-[48px] p-10 cursor-pointer hover:shadow-2xl hover:border-orange-500 transition-all duration-500 overflow-hidden relative flex flex-col"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <img src={club.logo} className="w-32 h-32" alt="" />
                                </div>
                                
                                <div className="flex items-center gap-6 mb-8 relative z-10">
                                    <img src={club.logo} className="w-20 h-20 rounded-[24px] shadow-lg ring-4 ring-slate-50" alt="" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-black tracking-tighter uppercase">{club.name}</h3>
                                            {club.isVerified && <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{club.location} • {club.memberCount} Members</p>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <button className="w-full py-4 bg-black text-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xl">
                                        Enter Clubhouse
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center mb-8">
                        <button 
                            onClick={() => setSelectedClubId(null)}
                            className="flex items-center gap-2 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-black transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Directory
                        </button>
                    </div>

                    <div className="bg-white rounded-[48px] p-12 shadow-sm border border-slate-100 mb-12 flex flex-col md:flex-row gap-12 items-center">
                        <img src={selectedClub?.logo} className="w-48 h-48 rounded-[48px] shadow-2xl ring-8 ring-slate-50" alt="" />
                        <div className="flex-grow">
                            <div className="flex items-center gap-4 mb-4">
                                <h2 className="text-5xl font-black text-black tracking-tighter uppercase">{selectedClub?.name}</h2>
                                {isAdmin && <span className="bg-orange-600 text-white px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Owner Control</span>}
                                {isMember && !isAdmin && <span className="bg-green-50 text-green-600 px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">Active Member</span>}
                            </div>
                            <p className="text-slate-500 font-medium italic mb-8 max-w-2xl leading-relaxed">"{selectedClub?.description}"</p>
                            <div className="flex gap-4">
                                {isMember || isAdmin ? (
                                    <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                                        <span className="text-sm font-black text-black">Member Authorized</span>
                                    </div>
                                ) : isPending ? (
                                    <div className="px-6 py-3 bg-orange-50 rounded-2xl border border-orange-100">
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Status</span>
                                        <span className="text-sm font-black text-orange-600">Pending Approval...</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleJoinRequest(selectedClub!.id)}
                                        className="bg-black text-orange-500 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all"
                                    >
                                        Apply to Join
                                    </button>
                                )}
                                <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">HQ</span>
                                    <span className="text-sm font-black text-black uppercase">{selectedClub?.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="mb-12 bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black uppercase tracking-tight"> Clubhouse Management</h3>
                                <div className="flex bg-white/5 p-1 rounded-2xl">
                                    {[
                                        { id: 'members', label: `Roster (${clubMembers.length})` },
                                        { id: 'pending_listings', label: 'Mod Queue' },
                                        { id: 'reports', label: 'Safety' }
                                    ].map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => setAdminTab(t.id as any)}
                                            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === t.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="min-h-[200px]">
                                {adminTab === 'members' && (
                                    <div className="space-y-8">
                                        {pendingMembers.length > 0 && (
                                            <section>
                                                <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Pending Applications</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {pendingMembers.map(member => (
                                                        <div key={member.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <img src={member.avatar} className="w-10 h-10 rounded-full" />
                                                                <div>
                                                                    <p className="text-xs font-black uppercase">{member.name}</p>
                                                                    <p className="text-[8px] font-black text-slate-500 uppercase">@{member.handle}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleApprove(member.id)} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-orange-500">Approve</button>
                                                                <button onClick={() => handleRemove(member.id)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-[8px] font-black uppercase">Deny</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        <section>
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Active Roster</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {clubMembers.map(member => (
                                                    <div key={member.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <img src={member.avatar} className="w-10 h-10 rounded-full" />
                                                            <div>
                                                                <p className="text-xs font-black uppercase">{member.name}</p>
                                                                <p className="text-[8px] font-black text-slate-500 uppercase">{member.id === selectedClub?.adminId ? 'Owner / Admin' : 'Member'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {member.id !== selectedClub?.adminId && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleRemove(member.id)}
                                                                        className="px-4 py-2 bg-white/10 text-white rounded-xl text-[8px] font-black uppercase hover:bg-white/20"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => db.banMemberFromClub(selectedClubId!, member.id, currentUser.id).then(() => loadAdminData(selectedClubId!))}
                                                                        className="px-4 py-2 bg-red-600/20 text-red-400 rounded-xl text-[8px] font-black uppercase hover:bg-red-600 hover:text-white"
                                                                    >
                                                                        Ban
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {adminTab === 'pending_listings' && (
                                    <div className="grid grid-cols-1 gap-4">
                                        {pendingAuctions.length > 0 ? pendingAuctions.map(auction => (
                                            <div key={auction.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <img src={auction.imageUrl} className="w-16 h-16 rounded-2xl object-cover" />
                                                    <div>
                                                        <p className="text-xs font-black uppercase text-orange-500">{auction.brand} • {auction.mold}</p>
                                                        <p className="text-[10px] font-black uppercase text-white tracking-widest mt-1">Proposed By: {auction.seller}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => db.saveAuction({...auction, status: 'active'}, currentUser.id).then(() => setSelectedClubId(selectedClubId))} className="bg-orange-600 px-6 py-2 rounded-xl text-[9px] font-black uppercase">Approve Listing</button>
                                                    <button onClick={() => db.hideAuction(auction.id).then(() => setSelectedClubId(selectedClubId))} className="bg-white/10 px-6 py-2 rounded-xl text-[9px] font-black uppercase">Reject</button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-20 text-center text-slate-500 font-black uppercase tracking-widest text-[10px]">No pending signals in mod queue</div>
                                        )}
                                    </div>
                                )}

                                {adminTab === 'reports' && (
                                    <div className="space-y-4">
                                        {clubReports.map(report => (
                                            <div key={report.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-10 h-10 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center text-lg">🚩</div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase text-white">{report.category}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase leading-relaxed mt-1">Ticket: {report.ticketId}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => db.updateReportStatus(report.id, ReportStatus.UnderReview, 'Under Review by Club Owner')} className="bg-white text-black px-6 py-2 rounded-xl text-[9px] font-black uppercase">Investigate</button>
                                            </div>
                                        ))}
                                        {clubReports.length === 0 && (
                                            <div className="py-20 text-center text-slate-500 font-black uppercase tracking-widest text-[10px]">Clean history. No active safety flags.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {clubAuctions.length > 0 ? clubAuctions.map(auction => (
                            <AuctionCard 
                                key={auction.id} 
                                auction={auction} 
                                onClick={onSelectAuction} 
                            />
                        )) : (
                            <div className="col-span-full py-40 text-center bg-slate-50 rounded-[64px] border-2 border-dashed border-slate-100">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">📦</div>
                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Club Vault Empty</h3>
                                <p className="text-[10px] font-bold text-slate-300 uppercase mt-2 tracking-widest">No active listings from club scouts currently.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showCreateModal && (
                <CreateClubModal 
                    currentUser={currentUser} 
                    onClose={() => setShowCreateModal(false)} 
                    onComplete={(id) => { setSelectedClubId(id); setShowCreateModal(false); loadClubs(); }} 
                />
            )}
        </div>
    );
};

export default ClubHub;