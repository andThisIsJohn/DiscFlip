import React from 'react';
import { User } from '../types';

interface BlockConfirmModalProps {
  targetUser: User;
  onClose: () => void;
  onConfirm: () => void;
}

const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  targetUser,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[48px] p-12 text-center animate-in zoom-in duration-300 shadow-2xl">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 text-3xl">
          🚫
        </div>
        <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-4">
          Block {targetUser.name}?
        </h3>

        <div className="bg-slate-50 rounded-3xl p-6 text-left space-y-4 mb-10 border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
            Safety Consequences:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-[10px] font-black uppercase text-slate-600">
              <span className="text-red-500">•</span>
              Active negotiations will be cancelled
            </li>
            <li className="flex gap-3 text-[10px] font-black uppercase text-slate-600">
              <span className="text-red-500">•</span>
              DMs will be immediately disabled
            </li>
            <li className="flex gap-3 text-[10px] font-black uppercase text-slate-600">
              <span className="text-red-500">•</span>
              They won&apos;t see your vault or store
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={onConfirm}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-red-600 transition-all active:scale-95"
          >
            Confirm & Block User
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 font-black uppercase text-[10px] tracking-widest py-2"
          >
            Keep Interactions Open
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockConfirmModal;
