
import React, { useState } from 'react';
import { Bounty, User, BountyStatus, BountySubmission, ReportTargetType } from '../types';
import { db } from '../services/databaseService';
import BountySubmissionForm from './BountySubmissionForm';
import SafetyMenu from './SafetyMenu';

interface BountyDetailProps {
    bounty: Bounty;
    currentUser: User;
    onClose: () => void;
    onReload: () => void;
}

const BountyDetail: React.FC<BountyDetailProps> = ({ bounty, currentUser, onClose, onReload }) => {
    const [showSubmitForm, setShowSubmitForm] = useState(false);
    const isOwner = bounty.buyerId === currentUser.id;
    const daysLeft = Math.ceil((bounty.expirationDate - Date.now()) / 86400000);

    const handleAcceptSubmission = async (submissionId: string) => {
        // Logic to transition to checkout or mark fulfilled
        alert("Submission accepted! Secure checkout window initiated.");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[64px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-500">
                
                {/* Left Panel: Bounty Requirements */}
                <div className="w-full md:w-5/12 bg-slate-50 p-12 overflow-y-auto border-r border-slate-100">
                    <div className="flex justify-between items-center mb-10">
                        <button onClick={onClose} className="text-slate-400 hover:text-black flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                            Back to Hub
                        </button>
                        <SafetyMenu 
                            targetUser={{ id: bounty.buyerId, name: bounty.buyerName }}
                            targetType={ReportTargetType.Bounty}
                            targetId={bounty.id}
                            currentUser={currentUser}
                            contextSnapshot={{
                                mold: bounty.mold,
                                brand: bounty.brand,
                                offer: bounty.priceOffer,
                                buyer: bounty.buyerName
                            }}
                            onActionComplete={() => { onClose(); onReload(); }}
                        />
                    </div>

                    <div className="mb-10">
                        <span className="bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block">Active Bounty</span>
                        <h1 className="text-5xl font-black text-black tracking-tighter leading-none mb-4">{bounty.mold}</h1>
                        <p className="text-xl font-bold text-slate-400 uppercase tracking-tight">{bounty.brand} • {bounty.plastic}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="bg-black p-8 rounded-[40px] text-white">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Target Bounty</span>
                            <div className="text-5xl font-black mb-1">${bounty.priceOffer}</div>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{bounty.priceIsShipped ? 'Total Shipped Price' : '+ Shipping Cost'}</p>
                        </div>
                        <div className="bg-white border border-slate-200 p-8 rounded-[40px] text-center flex flex-col justify-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Closing In</span>
                            <div className="text-3xl font-black text-black">{daysLeft} Days</div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <h4 className="text-xs font-black text-black uppercase tracking-[0.2em] border-b border-slate-200 pb-4">Required Specs</h4>
                        <div className="grid grid-cols-2 gap-y-6">
                            {[
                                { label: 'Weight Range', value: `${bounty.weightMin}-${bounty.weightMax}g` },
                                { label: 'Dome Profile', value: bounty.domePreference },
                                { label: 'Min Condition', value: `${bounty.conditionMin}/10+` },
                                { label: 'Ink Allowed', value: bounty.inkAllowed ? 'Yes' : 'None' },
                                { label: 'Glow Reqd', value: bounty.glowRequired ? 'Yes' : 'No' },
                                { label: 'Must Be Unthrown', value: bounty.mustBeUnthrown ? 'Yes' : 'No' }
                            ].map(spec => (
                                <div key={spec.label}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">{spec.label}</span>
                                    <span className="text-sm font-black text-black uppercase">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                        
                        {bounty.colorPreference && (
                            <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-2">Aesthetic Preference</span>
                                <p className="text-sm font-medium italic text-slate-600">"{bounty.colorPreference}"</p>
                            </div>
                        )}
                    </div>

                    {!isOwner && bounty.status === BountyStatus.Open && (
                        <button 
                            onClick={() => setShowSubmitForm(true)}
                            className="w-full bg-black text-orange-500 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs mt-12 shadow-2xl hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                        >
                            I Have This Disc
                        </button>
                    )}
                </div>

                {/* Right Panel: Submissions / Activity */}
                <div className="flex-grow p-12 overflow-y-auto bg-white">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black text-black uppercase tracking-tight">Active Submissions ({bounty.submissions.length})</h3>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">View Count:</span>
                             <span className="text-sm font-black text-black">{bounty.viewCount}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {bounty.submissions.length > 0 ? bounty.submissions.map(sub => (
                            <div key={sub.id} className="bg-slate-50 border border-slate-100 rounded-[48px] p-8 flex flex-col md:flex-row gap-8 items-start group hover:bg-white hover:shadow-xl transition-all duration-500">
                                <div className="w-full md:w-48 aspect-square rounded-[32px] overflow-hidden bg-white shadow-inner">
                                    <img src={sub.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                </div>
                                <div className="flex-grow space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{sub.sellerName}</p>
                                            <h4 className="text-2xl font-black text-black uppercase tracking-tighter">${sub.priceProposed} Total</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-white px-3 py-1 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Proposed</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-xs font-bold text-slate-600">
                                            <span className="text-[8px] font-black text-slate-300 uppercase block">Condition</span>
                                            {sub.condition}/10 {sub.hasInk ? '• Inked' : '• No Ink'}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-200 pl-4">"{sub.notes}"</p>
                                    
                                    {isOwner && (
                                        <div className="flex gap-3 pt-4">
                                            <button 
                                                onClick={() => handleAcceptSubmission(sub.id)}
                                                className="flex-[2] bg-black text-orange-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-lg"
                                            >
                                                Accept & Purchase
                                            </button>
                                            <button className="flex-1 bg-white border border-slate-200 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black">Message</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="py-24 text-center bg-slate-50 rounded-[48px] border-2 border-dashed border-slate-100">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Waiting for the right plastic to surface...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showSubmitForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-white w-full max-w-xl rounded-[48px] p-10 animate-in zoom-in duration-300">
                        <BountySubmissionForm 
                            bounty={bounty} 
                            currentUser={currentUser} 
                            onCancel={() => setShowSubmitForm(false)} 
                            onSuccess={async (s) => {
                                await db.submitBountyMatch({ ...s, bountyId: bounty.id, sellerId: currentUser.id, sellerName: currentUser.name });
                                setShowSubmitForm(false);
                                onReload();
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default BountyDetail;
