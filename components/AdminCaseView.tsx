
import React, { useState, useEffect } from 'react';
import { User, DiscAuction, UserReport, ReportStatus, Message, RestrictionLevel } from '../types';
import { db } from '../services/databaseService';

interface AdminCaseViewProps {
    reportId: string;
    currentUser: User;
    onClose: () => void;
}

const AdminCaseView: React.FC<AdminCaseViewProps> = ({ reportId, currentUser, onClose }) => {
    const [report, setReport] = useState<UserReport | null>(null);
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [reporterUser, setReporterUser] = useState<User | null>(null);
    const [targetListing, setTargetListing] = useState<DiscAuction | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [noteText, setNoteText] = useState('');
    const [pastReports, setPastReports] = useState<UserReport[]>([]);

    useEffect(() => {
        loadCaseData();
    }, [reportId]);

    const loadCaseData = async () => {
        const allReports = await db.getReports();
        const foundReport = allReports.find(r => r.id === reportId);
        if (!foundReport) return;
        setReport(foundReport);

        const allUsers = await db.getUsers();
        const target = allUsers.find(u => u.id === (foundReport.targetOwnerId || foundReport.targetId));
        const reporter = allUsers.find(u => u.id === foundReport.reporterId);
        setTargetUser(target || null);
        setReporterUser(reporter || null);

        if (foundReport.targetType === 'Auction / Listing') {
            const allAuctions = await db.getAuctions();
            setTargetListing(allAuctions.find(a => a.id === foundReport.targetId) || null);
        }

        if (foundReport.targetType === 'Direct Message' || foundReport.targetType === 'Order') {
            // Fix for Error in file components/AdminCaseView.tsx on line 43: Expected 2 arguments, but got 1.
            const msgs = await db.getMessages(foundReport.targetId, currentUser.id);
            setMessages(msgs);
        }

        setPastReports(allReports.filter(r => r.targetOwnerId === target?.id && r.id !== reportId));
    };

    const handleAction = async (action: 'warn' | 'mute' | 'freeze' | 'ban') => {
        if (!targetUser) return;
        const confirmMsg = `Are you sure you want to ${action} user ${targetUser.name}?`;
        if (!window.confirm(confirmMsg)) return;

        await db.applyModerationAction(targetUser.id, action, report?.category || 'Rule violation', currentUser.id, reportId);
        await db.addInternalNote(reportId, currentUser.id, currentUser.name, `Applied moderation action: ${action}`);
        loadCaseData();
    };

    const handleHideListing = async () => {
        if (!targetListing) return;
        await db.hideAuction(targetListing.id);
        await db.addInternalNote(reportId, currentUser.id, currentUser.name, "Manually hid listing via Admin Control");
        loadCaseData();
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        await db.addInternalNote(reportId, currentUser.id, currentUser.name, noteText);
        setNoteText('');
        loadCaseData();
    };

    const resolveCase = async (dismiss = false) => {
        await db.updateReportStatus(reportId, dismiss ? ReportStatus.Dismissed : ReportStatus.Resolved, "Resolution applied by admin.");
        onClose();
    };

    if (!report || !targetUser) return null;

    return (
        <div className="animate-in slide-in-from-right-10 duration-700 h-full flex flex-col gap-8 pb-20">
            {/* Header / Case Identity */}
            <div className="bg-white border-2 border-slate-100 rounded-[48px] p-10 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-8">
                    <button onClick={onClose} className="p-4 bg-slate-50 text-slate-400 hover:text-black rounded-3xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Case #{report.ticketId}</h2>
                            <span className="px-3 py-1 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{report.severity} Priority</span>
                            <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{report.status}</span>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Safety Trigger: {report.category}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => resolveCase(true)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase text-[10px] hover:bg-slate-200 transition-all">Dismiss Case</button>
                    <button onClick={() => resolveCase(false)} className="px-8 py-4 bg-black text-orange-50 rounded-[20px] font-black uppercase text-[10px] hover:bg-orange-600 hover:text-white transition-all shadow-xl">Finalize Resolution</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Center Panel: Evidence & Forensics */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Content Snapshot */}
                    <div className="bg-white border-2 border-slate-100 rounded-[48px] overflow-hidden shadow-sm">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest">Content Snapshot</h3>
                            <span className="text-[9px] font-black text-slate-300 uppercase">Automated Trigger Point</span>
                        </div>
                        <div className="p-10">
                            {targetListing ? (
                                <div className="flex gap-8 items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <img src={targetListing.imageUrl} className="w-40 h-40 rounded-[32px] object-cover shadow-xl" />
                                    <div className="space-y-2">
                                        <h4 className="text-2xl font-black uppercase tracking-tight">{targetListing.mold}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{targetListing.brand} • {targetListing.plastic} • ${targetListing.soldPrice || targetListing.currentBid}</p>
                                        <div className="pt-4 flex gap-3">
                                            <button onClick={handleHideListing} className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase">Hide Listing</button>
                                            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase">View Item Trace</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                     <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{report.details}"</p>
                                     {report.evidencePhotos.length > 0 && (
                                         <div className="grid grid-cols-4 gap-4 mt-8">
                                             {report.evidencePhotos.map((img, i) => (
                                                 <img key={i} src={img} className="aspect-square rounded-2xl object-cover shadow-sm ring-2 ring-white" />
                                             ))}
                                         </div>
                                     )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message Excerpts */}
                    {messages.length > 0 && (
                        <div className="bg-white border-2 border-slate-100 rounded-[48px] overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="text-sm font-black uppercase tracking-widest">Message context around violation</h3>
                            </div>
                            <div className="p-10 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex gap-4 p-4 rounded-2xl ${m.senderId === reporterUser?.id ? 'bg-slate-50' : 'bg-orange-50/30'}`}>
                                        <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center font-black text-[10px] border border-slate-100 shadow-sm">
                                            {m.senderId === targetUser.id ? 'T' : 'R'}
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{m.senderId === targetUser.id ? 'Target' : 'Reporter'} • {new Date(m.timestamp).toLocaleTimeString()}</p>
                                            <p className="text-xs font-medium text-slate-700 leading-snug">{m.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Internal Notes / Audit Trail */}
                    <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <h3 className="text-xl font-black uppercase tracking-tight">Internal Audit Logs</h3>
                            <div className="space-y-6">
                                {report.internalNotes.map(note => (
                                    <div key={note.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Admin: {note.adminName}</span>
                                            <span className="text-[9px] text-slate-500">{new Date(note.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-300">"{note.text}"</p>
                                    </div>
                                ))}
                                {report.internalNotes.length === 0 && <p className="text-slate-500 italic text-sm">No internal notes yet.</p>}
                            </div>
                            <div className="flex gap-4">
                                <input 
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder="Add case forensics note..."
                                    className="flex-grow bg-white/10 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <button onClick={handleAddNote} className="px-8 bg-white text-black rounded-2xl font-black uppercase text-[10px] hover:bg-orange-500 hover:text-white transition-all">Add Note</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Involved Users & Immediate Actions */}
                <div className="space-y-8">
                    {/* User Profiles Card */}
                    <section className="bg-white border-2 border-slate-100 rounded-[48px] p-10 shadow-sm space-y-10">
                        <div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">Reporter Forensics</span>
                            <div className="flex items-center gap-4">
                                <img src={reporterUser?.avatar} className="w-12 h-12 rounded-2xl" />
                                <div>
                                    <p className="text-sm font-black uppercase">{reporterUser?.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{reporterUser?.rating} ★ • {reporterUser?.totalSales} Sales</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-4">Target Investigations</span>
                            <div className="flex items-center gap-4 mb-6">
                                <img src={targetUser.avatar} className="w-16 h-16 rounded-[24px] shadow-xl" />
                                <div>
                                    <p className="text-lg font-black uppercase text-black">{targetUser.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">@{targetUser.handle} • {targetUser.rating} ★</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Strikes</span>
                                    <span className="text-sm font-black text-red-600">{targetUser.strikes || 0}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Spam Score</span>
                                    <span className="text-sm font-black text-orange-600">{targetUser.spamScore || 0}</span>
                                </div>
                            </div>
                        </div>

                        {pastReports.length > 0 && (
                            <div className="pt-8 border-t border-slate-50">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">Past Flags ({pastReports.length})</span>
                                <div className="space-y-3">
                                    {pastReports.map(pr => (
                                        <div key={pr.id} className="text-[9px] font-black uppercase p-3 bg-red-50 text-red-700 rounded-xl">
                                            {new Date(pr.timestamp).toLocaleDateString()}: {pr.category}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Quick Execution Control */}
                    <section className="bg-slate-50 rounded-[48px] p-10 border-2 border-slate-100 space-y-6">
                        <h3 className="text-xl font-black uppercase text-black tracking-tight mb-8">Enforcement Panel</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => handleAction('warn')} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] hover:border-black hover:text-black transition-all">Warn Hunter</button>
                            <button onClick={() => handleAction('mute')} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] hover:border-black hover:text-black transition-all">Restict Messaging (Mute)</button>
                            <div className="h-[2px] bg-slate-100 my-2" />
                            <button onClick={() => handleAction('freeze')} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-orange-500 shadow-xl shadow-orange-500/10">Freeze Vault (3 Days)</button>
                            <button onClick={() => handleAction('ban')} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-red-500 shadow-xl shadow-red-500/10">Permanent Ban (Nuclear)</button>
                        </div>
                        <p className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-6">Actions are logged to system audit trail.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminCaseView;
