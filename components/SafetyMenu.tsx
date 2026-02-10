
import React, { useState } from 'react';
import { User, ReportTargetType } from '../types';
import { db } from '../services/databaseService';
import BlockConfirmModal from './BlockConfirmModal';
import ReportModal from './ReportModal';

interface SafetyMenuProps {
    targetUser: { id: string, name: string, handle?: string, avatar?: string };
    targetType: ReportTargetType;
    targetId: string;
    currentUser: User;
    contextSnapshot: any;
    onActionComplete: () => void;
    align?: 'left' | 'right';
    variant?: 'default' | 'minimal';
}

const SafetyMenu: React.FC<SafetyMenuProps> = ({ 
    targetUser, 
    targetType, 
    targetId, 
    currentUser, 
    contextSnapshot, 
    onActionComplete, 
    align = 'right',
    variant = 'default'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReportAndBlock, setIsReportAndBlock] = useState(false);

    if (!currentUser || targetUser.id === currentUser.id) return null;

    const isMuted = currentUser.mutedUserIds?.includes(targetUser.id);

    const handleMute = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isMuted) await db.unmuteUser(currentUser.id, targetUser.id);
        else await db.muteUser(currentUser.id, targetUser.id);
        setIsOpen(false);
        onActionComplete();
    };

    const handleReportAndBlock = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsReportAndBlock(true);
        setShowReportModal(true);
        setIsOpen(false);
    };

    const handleReportOnly = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsReportAndBlock(false);
        setShowReportModal(true);
        setIsOpen(false);
    };

    const handleBlockOnly = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowBlockModal(true);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`transition-all rounded-xl ${
                    variant === 'minimal' 
                    ? 'p-1 text-slate-400 hover:text-black hover:bg-slate-100' 
                    : 'p-3 bg-slate-50 text-slate-400 hover:text-black hover:bg-white shadow-sm border border-slate-100'
                }`}
                title="Safety Tools"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[190]" onClick={() => setIsOpen(false)} />
                    <div className={`absolute top-full mt-2 w-56 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[200] overflow-hidden py-2 animate-in slide-in-from-top-2 ${align === 'right' ? 'right-0' : 'left-0'}`}>
                        <button onClick={handleMute} className="w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-3">
                            <span className="text-sm">{isMuted ? '🔊' : '🔇'}</span>
                            {isMuted ? 'Unmute User' : 'Mute User'}
                        </button>
                        <button onClick={handleBlockOnly} className="w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-3">
                            <span className="text-sm">🚫</span>
                            Block User
                        </button>
                        <button onClick={handleReportOnly} className="w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-3">
                            <span className="text-sm">🚩</span>
                            Report {targetType.split(' ')[0]}
                        </button>
                        <div className="h-[1px] bg-slate-100 my-2" />
                        <button onClick={handleReportAndBlock} className="w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3">
                            <span className="text-sm">⚖️</span>
                            Report & Block
                        </button>
                    </div>
                </>
            )}

            {showBlockModal && (
                <BlockConfirmModal 
                    targetUser={targetUser as User}
                    onClose={() => setShowBlockModal(false)}
                    onConfirm={async () => {
                        await db.blockUser(currentUser.id, targetUser.id);
                        setShowBlockModal(false);
                        onActionComplete();
                    }}
                />
            )}

            {showReportModal && (
                <ReportModal 
                    targetType={targetType}
                    targetId={targetId}
                    targetOwnerId={targetUser.id}
                    contextSnapshot={contextSnapshot}
                    currentUser={currentUser}
                    onClose={() => {
                        setShowReportModal(false);
                        if (isReportAndBlock) {
                            db.blockUser(currentUser.id, targetUser.id).then(onActionComplete);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default SafetyMenu;
