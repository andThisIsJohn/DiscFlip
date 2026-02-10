
import React, { useState, useEffect, useRef } from 'react';
import { Thread, User, Message, MessageOffer, ReportTargetType, RestrictionLevel } from '../types';
import { db } from '../services/databaseService';
import { security } from '../services/securityService';
import SafetyMenu from './SafetyMenu';
import ReportModal from './ReportModal';

interface ConversationThreadProps {
    thread: Thread;
    currentUser: User;
    onUpdate: () => void;
    onBack?: () => void;
}

const ConversationThread: React.FC<ConversationThreadProps> = ({ thread, currentUser, onUpdate, onBack }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isScamWarning, setIsScamWarning] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState(0);
    const [restriction, setRestriction] = useState<{ level: RestrictionLevel, expires?: number }>({ level: RestrictionLevel.None });
    const scrollRef = useRef<HTMLDivElement>(null);

    const isBuyer = thread.buyerId === currentUser.id;
    const roleLabel = isBuyer ? 'Buyer' : 'Seller';

    const [isInteractionBlocked, setIsInteractionBlocked] = useState(false);
    const [otherUser, setOtherUser] = useState<User | null>(null);

    useEffect(() => {
        const checkSafety = async () => {
            const allUsers = await db.getUsers();
            const otherId = thread.participantIds.find(id => id !== currentUser.id);
            const other = allUsers.find(u => u.id === otherId);
            if (other) {
                setOtherUser(other);
                setIsInteractionBlocked(
                    currentUser.blockedUserIds?.includes(other.id) || 
                    other.blockedUserIds?.includes(currentUser.id)
                );
            }
            const status = await db.getEnforcementStatus(currentUser.id);
            setRestriction(status);
        };
        checkSafety();
        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [thread.id, currentUser.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadMessages = async () => {
        try {
            const list = await db.getMessages(thread.id, currentUser.id);
            setMessages(list);
        } catch (e: any) {
            console.error(e.message);
        }
    };

    const handleTextChange = (text: string) => {
        setInputText(text);
        const { flagged } = security.scanForOffPlatformTriggers(text);
        setIsScamWarning(flagged);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isInteractionBlocked) return;

        // Restriction Check
        if (restriction.level !== RestrictionLevel.None && restriction.level !== RestrictionLevel.Warning) {
            alert(`Messaging restricted until ${new Date(restriction.expires!).toLocaleString()}`);
            return;
        }
        
        // Automated security enforcement
        if (isScamWarning) {
            await security.autoEnforce(currentUser.id, "Attempted off-platform payment negotiation");
            alert("SECURITY ALERT: Your message was blocked. Attempting to pay outside the app is a violation of the Hunter's Code. A strike has been issued.");
            setInputText('');
            setIsScamWarning(false);
            return;
        }

        try {
            await db.sendMessage(thread.id, currentUser.id, inputText);
            setInputText('');
            setIsScamWarning(false);
            loadMessages();
            onUpdate();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSendOffer = async () => {
        if (isInteractionBlocked) return;
        const offer: MessageOffer = {
            amount: offerAmount,
            shippingIncluded: true,
            expiresAt: Date.now() + 86400000,
            status: 'pending'
        };
        try {
            await db.sendMessage(thread.id, currentUser.id, `Value Proposal sent: $${offerAmount}`, { offer });
            setShowOfferModal(false);
            loadMessages();
            onUpdate();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 relative bg-white">
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3 md:gap-6 min-w-0">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-black transition-colors">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    <img src={thread.objectImage} className="w-10 h-10 md:w-16 md:h-16 rounded-[16px] md:rounded-[20px] object-cover ring-4 ring-slate-50 flex-shrink-0" alt="" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm md:text-lg font-black text-black uppercase tracking-tight leading-none truncate">{thread.objectTitle}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${isBuyer ? 'bg-orange-600 text-white' : 'bg-black text-white'}`}>
                                {roleLabel}
                            </span>
                        </div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                            {thread.type} • Secured Conversation
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {otherUser && (
                        <SafetyMenu 
                            targetUser={otherUser}
                            targetType={ReportTargetType.Message}
                            targetId={thread.id}
                            currentUser={currentUser}
                            contextSnapshot={{ threadId: thread.id }}
                            onActionComplete={onUpdate}
                        />
                    )}
                </div>
            </div>

            <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/30 custom-scrollbar min-h-0">
                 <div className="text-center mb-6">
                    <span className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-600 inline-flex items-center gap-2 shadow-sm">
                        🛡️ Vault Shield Protection • PII Filter Active
                    </span>
                    {thread.type !== 'order' && (
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Contact info is masked until an order is verified.</p>
                    )}
                 </div>

                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting initial handshake.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[80%] flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                                {msg.offer ? (
                                    <div className="bg-black text-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl w-64 md:w-80 mb-2 border border-orange-500/30">
                                         <div className="flex justify-between items-center mb-4 md:mb-6">
                                            <span className="text-[9px] md:text-[10px] font-black text-orange-400 uppercase tracking-widest">Price Offer</span>
                                         </div>
                                         <div className="text-4xl md:text-5xl font-black mb-1">${msg.offer.amount}</div>
                                         <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6 md:mb-8">Authorized escrow proposal</p>
                                         {msg.senderId !== currentUser.id && msg.offer.status === 'pending' && (
                                             <div className="flex gap-2 md:gap-3">
                                                <button className="flex-1 py-3 bg-orange-600 text-white rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest">Accept</button>
                                                <button className="flex-1 py-3 bg-white/10 text-white rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest">Decline</button>
                                             </div>
                                         )}
                                    </div>
                                ) : (
                                    <div className={`p-4 md:p-5 rounded-[20px] md:rounded-[28px] text-xs md:text-sm font-medium shadow-sm leading-relaxed ${
                                        msg.senderId === currentUser.id 
                                            ? 'bg-black text-white rounded-tr-none' 
                                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                )}
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex-shrink-0 bg-white border-t border-slate-100 z-10">
                {isInteractionBlocked || (restriction.level !== RestrictionLevel.None && restriction.level !== RestrictionLevel.Warning && restriction.level !== RestrictionLevel.RestrictedMessaging) ? (
                    <div className="p-10 bg-slate-50 text-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Signal blocked by safety protocol.</p>
                         <p className="text-[8px] text-slate-300 mt-2">Check your account status or contact support if you believe this is an error.</p>
                    </div>
                ) : (
                    <>
                        {isScamWarning && (
                            <div className="bg-red-50 border-b border-red-100 p-4 animate-in slide-in-from-bottom-2">
                                <div className="max-w-xl mx-auto flex items-center justify-between gap-4 text-red-700">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        <p className="text-[10px] font-black uppercase">Restricted: Off-platform payment detected. Sending this will issue a strike.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 md:p-6 bg-white">
                            <form onSubmit={handleSendMessage} className="flex gap-3 md:gap-4 items-center">
                                <button type="button" onClick={() => setShowOfferModal(true)} className="p-3 md:p-4 bg-orange-100 text-orange-600 rounded-[16px] md:rounded-[20px] hover:bg-orange-600 hover:text-white transition-all shadow-sm flex-shrink-0">
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                                <div className="flex-grow relative">
                                    <input 
                                        type="text" 
                                        value={inputText}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        placeholder="Secure message..."
                                        className={`w-full pl-4 md:pl-6 pr-10 md:pr-12 py-3 md:py-5 bg-slate-50 border-2 rounded-[24px] md:rounded-[32px] font-bold text-black outline-none focus:border-orange-500 transition-all text-sm ${isScamWarning ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                    />
                                    <button type="submit" className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-black text-orange-50 rounded-xl md:rounded-2xl hover:bg-orange-600 hover:text-white transition-all">
                                         <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {showOfferModal && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[48px] p-8 md:p-12 animate-in zoom-in duration-300 shadow-2xl">
                        <h3 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight mb-6 md:mb-8 text-center">Value Proposal</h3>
                        <div className="space-y-6 md:space-y-8">
                            <div className="bg-slate-50 p-6 md:p-8 rounded-[32px] md:rounded-[40px] text-center border border-slate-100">
                                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Total Amount ($)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <span className="text-3xl md:text-4xl font-black">$</span>
                                    <input 
                                        type="number" 
                                        value={offerAmount}
                                        onChange={(e) => setOfferAmount(Number(e.target.value))}
                                        className="w-24 md:w-32 bg-transparent font-black text-4xl md:text-5xl text-black outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 md:gap-4">
                                <button onClick={() => setShowOfferModal(false)} className="flex-1 py-4 md:py-5 text-[9px] md:text-[10px] font-black uppercase text-slate-400 hover:text-black transition-colors">Discard</button>
                                <button onClick={handleSendOffer} className="flex-[2] bg-black text-orange-50 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black uppercase tracking-widest shadow-2xl hover:bg-orange-600 hover:text-white transition-all">Authorize Proposal</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversationThread;
