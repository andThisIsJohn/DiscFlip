import React, { useState, useEffect } from 'react';
import { User, DiscAuction } from '../types';
import { db } from '../services/databaseService';

interface AdminOrderTimelineProps {
  orderId: string;
  currentUser: User;
  onBack: () => void;
  onActionComplete: () => void;
}

interface CombinedLog {
  id: string;
  timestamp: number;
  type: 'tracking' | 'message' | 'admin';
  content: string;
  user?: string;
  meta?: string;
}

const AdminOrderTimeline: React.FC<AdminOrderTimelineProps> = ({
  orderId,
  currentUser,
  onBack,
  onActionComplete,
}) => {
  const [order, setOrder] = useState<DiscAuction | null>(null);
  const [logs, setLogs] = useState<CombinedLog[]>([]);
  const [actionReason, setActionReason] = useState('');
  const [isConfirming, setIsConfirming] = useState<'refund' | 'close' | 'extend' | null>(null);

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    const allAuctions = await db.getAuctions();
    const found = allAuctions.find((a) => a.id === orderId);
    if (!found) return;
    setOrder(found);

    // Fetch Messages using admin bypass
    const thread = await db.adminGetThreadForOrder(found.id);
    // Fix for Error in file components/AdminOrderTimeline.tsx on line 40: Expected 2 arguments, but got 1.
    const messages = thread ? await db.getMessages(thread.id, currentUser.id) : [];

    // Build Unified Timeline
    const unified: CombinedLog[] = [];

    (found.trackingEvents || []).forEach((ev) =>
      unified.push({
        id: ev.id,
        timestamp: ev.timestamp,
        type: 'tracking',
        content: ev.message,
        meta: ev.location,
      })
    );

    messages.forEach((m) =>
      unified.push({
        id: m.id,
        timestamp: m.timestamp,
        type: 'message',
        content: m.text,
        user: m.senderId,
      })
    );

    (found.adminLogs || []).forEach((al) =>
      unified.push({
        id: al.id,
        timestamp: al.timestamp,
        type: 'admin',
        content: al.action,
        meta: al.reason,
      })
    );

    setLogs(unified.sort((a, b) => a.timestamp - b.timestamp));
  };

  const handleForceRefund = async () => {
    if (!actionReason) return alert('Action reason required for forensic logs.');
    await db.adminForceRefund(orderId, currentUser.id, actionReason);
    onActionComplete();
  };

  const handleForceClose = async () => {
    if (!actionReason) return alert('Action reason required for forensic logs.');
    await db.adminForceClose(orderId, currentUser.id, actionReason);
    onActionComplete();
  };

  const handleExtend = async () => {
    await db.adminExtendWindow(orderId, currentUser.id, 48); // Fixed 48h extension for demo
    loadData();
    setIsConfirming(null);
  };

  if (!order) return null;

  return (
    <div className="animate-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="p-3 bg-slate-50 text-slate-400 hover:text-black rounded-2xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <img
            src={order.imageUrl}
            className="w-16 h-16 rounded-2xl object-cover shadow-inner"
            alt=""
          />
          <div>
            <h2 className="text-xl font-black text-black uppercase tracking-tight">
              {order.mold} Forensic View
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Order #{orderId.toUpperCase()} • ${order.soldPrice}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <span
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${order.status === 'refunded' ? 'bg-red-50 text-red-600' : 'bg-slate-900 text-white'}`}
          >
            Status: {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow overflow-hidden">
        {/* Unified Timeline */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[48px] flex flex-col shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-black uppercase tracking-widest">
              Unified Signal Log
            </h3>
            <p className="text-[9px] font-black text-slate-300 uppercase italic">
              Combines Tracking, Messaging & Admin Ops
            </p>
          </div>
          <div className="flex-grow overflow-y-auto p-10 space-y-10 custom-scrollbar">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div
                  key={log.id}
                  className="relative flex gap-8 group animate-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="absolute left-[21px] top-10 bottom-[-40px] w-0.5 bg-slate-50 last:hidden" />
                  <div
                    className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center z-10 shadow-sm border ${
                      log.type === 'tracking'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : log.type === 'message'
                          ? 'bg-green-50 text-green-600 border-green-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                    }`}
                  >
                    {log.type === 'tracking' ? '🚚' : log.type === 'message' ? '💬' : '⚖️'}
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <span
                        className={`text-[7px] font-black uppercase px-2 rounded ${
                          log.type === 'tracking'
                            ? 'text-blue-500'
                            : log.type === 'message'
                              ? 'text-green-500'
                              : 'text-red-500'
                        }`}
                      >
                        {log.type}
                      </span>
                    </div>
                    <h4
                      className={`text-sm font-black uppercase leading-tight ${log.type === 'message' ? 'text-slate-500 italic' : 'text-black'}`}
                    >
                      {log.user ? `${log.user === order.sellerId ? 'SELLER' : 'BUYER'}: ` : ''}
                      {log.content}
                    </h4>
                    {log.meta && (
                      <p className="text-[10px] font-medium text-slate-400 mt-2 uppercase">
                        {log.meta}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <p className="text-slate-300 font-black uppercase tracking-widest italic">
                  No signals recorded yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Force Actions Panel */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-tight mb-8">Override Panel</h3>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">
                    Required Action Reason
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Explain this override for internal audit..."
                    rows={3}
                    className="w-full p-4 bg-white/10 rounded-2xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setIsConfirming('refund')}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-red-900/20"
                  >
                    Force Full Refund
                  </button>
                  <button
                    onClick={() => setIsConfirming('close')}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-green-900/20"
                  >
                    Force Close & Release
                  </button>
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => setIsConfirming('extend')}
                      className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Extend Buyer Window (+48h)
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
          </section>

          {/* Order Meta Card */}
          <div className="bg-white border border-slate-100 rounded-[48px] p-10 shadow-sm space-y-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              Transaction Metadata
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-400">Escrow Protected</span>
                <span className="text-green-600">YES</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-400">High-Value Safeguard</span>
                <span className={order.isHighValueHold ? 'text-red-600' : 'text-slate-300'}>
                  {order.isHighValueHold ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-400">Signature Required</span>
                <span className={order.signatureRequired ? 'text-blue-600' : 'text-slate-300'}>
                  {order.signatureRequired ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Overlay */}
      {isConfirming && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[48px] p-12 text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 text-3xl">
              ⚠️
            </div>
            <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-4">
              Execute Override?
            </h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium uppercase text-[10px]">
              This action is permanent and will be logged to your admin ID.{' '}
              {isConfirming === 'refund'
                ? 'Funds will be immediately pulled from pending and returned to buyer.'
                : 'Order will be finalized and payout completed.'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsConfirming(null)}
                className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]"
              >
                Abort
              </button>
              <button
                onClick={
                  isConfirming === 'refund'
                    ? handleForceRefund
                    : isConfirming === 'close'
                      ? handleForceClose
                      : handleExtend
                }
                className="flex-[2] bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-red-600 transition-all"
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderTimeline;
