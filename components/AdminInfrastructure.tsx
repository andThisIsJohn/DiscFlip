
import React, { useState, useEffect } from 'react';
import { InfraHealth } from '../types';

interface AdminInfrastructureProps {
    health: InfraHealth;
}

const AdminInfrastructure: React.FC<AdminInfrastructureProps> = ({ health }) => {
    const [pulseData, setPulseData] = useState<number[]>(Array.from({ length: 30 }).map(() => 20 + Math.random() * 80));

    useEffect(() => {
        const interval = setInterval(() => {
            setPulseData(prev => {
                const next = [...prev.slice(1), 20 + Math.random() * 80];
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Payment Node */}
                <div className="bg-white border-2 border-slate-100 rounded-[48px] p-10 shadow-sm">
                    <div className="flex justify-between items-start mb-10">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">💳</div>
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            health.webhooks === 'Operational' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                        }`}>
                            {health.webhooks}
                        </span>
                    </div>
                    <h3 className="text-xl font-black uppercase mb-2">Stripe Connect Webhooks</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Financial Signal Integrity</p>
                    <div className="space-y-4 pt-6 border-t border-slate-50">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Last Handshake</span><span className="text-xs font-black">Just Now</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Auth Level</span><span className="text-xs font-black uppercase text-indigo-600">PCI-DSS V4</span></div>
                    </div>
                </div>

                {/* Queue Backlog Node */}
                <div className="bg-white border-2 border-slate-100 rounded-[48px] p-10 shadow-sm">
                    <div className="flex justify-between items-start mb-10">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">⏳</div>
                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">Active</span>
                    </div>
                    <h3 className="text-xl font-black uppercase mb-2">Background Queues</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Redis Processing Backlog</p>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                         <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${(health.queueBacklog / 150) * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Jobs Pending</span><span className="text-lg font-black">{health.queueBacklog}</span></div>
                </div>

                {/* Error Node */}
                <div className="bg-white border-2 border-slate-100 rounded-[48px] p-10 shadow-sm">
                    <div className="flex justify-between items-start mb-10">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🚨</div>
                        <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100">Healthy</span>
                    </div>
                    <h3 className="text-xl font-black uppercase mb-2">Error Pulse Rate</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Sentry 1m Average</p>
                    <div className="text-5xl font-black text-black">{health.errorRate.toFixed(2)}%</div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-4">Threshold: 1.50%</p>
                </div>
            </div>

            {/* Performance Monitoring Section */}
            <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl">
                 <div className="flex justify-between items-end mb-12">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">System Performance Timeline</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest">Global Data-Plane Health • Live Stream</p>
                    </div>
                    <button className="bg-white/10 px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Export Logs</button>
                 </div>
                 
                 <div className="h-48 flex items-end gap-2 px-4">
                    {pulseData.map((val, i) => (
                        <div 
                            key={i} 
                            className="bg-orange-600/40 rounded-t-lg flex-grow hover:bg-orange-500 transition-all cursor-crosshair relative group"
                            style={{ height: `${val}%` }}
                        >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-black px-2 py-1 rounded text-[7px] font-black opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-xl">
                                {Math.floor(val * 0.8 + 20)}ms
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="flex justify-between mt-6 px-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase">30 Minutes Ago</span>
                    <span className="text-[9px] font-black text-orange-600 uppercase animate-pulse">Streaming Signal</span>
                 </div>
            </div>
        </div>
    );
};

export default AdminInfrastructure;
