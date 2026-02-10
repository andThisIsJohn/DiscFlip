
import React, { useState, useEffect } from 'react';
import { User, SellerPerformance } from '../types';
import { db } from '../services/databaseService';

interface SellerAnalyticsProps {
    user: User;
}

const SellerAnalytics: React.FC<SellerAnalyticsProps> = ({ user }) => {
    const [perf, setPerf] = useState<SellerPerformance | null>(null);

    useEffect(() => {
        db.calculateSellerPerformance(user.id).then(setPerf);
    }, [user.id]);

    // Mock demand forecast if not present
    const demandForecast = "High demand for lightweight (155-165g) Halo Star plastic detected in the Southeast region.";

    const formatMsToTime = (ms: number) => {
        if (ms === 0) return 'N/A';
        const hours = Math.floor(ms / 3600000);
        if (hours < 24) return `${hours}h Average`;
        return `${Math.floor(hours / 24)}d ${hours % 24}h Average`;
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6">
            {/* Shipping Performance Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Ship Speed</span>
                        <div className="text-4xl font-black mb-1">{perf ? formatMsToTime(perf.avgShipTimeMs) : 'Calculating...'}</div>
                        <p className="text-[10px] text-slate-400 uppercase font-black">Paid → Carrier Scan</p>
                    </div>
                    <div className="absolute top-0 right-0 p-8">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 p-10 rounded-[48px] shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tracking Compliance</span>
                        <div className="text-4xl font-black mb-1">{perf ? `${Math.round(perf.trackingComplianceRate)}%` : '...'}</div>
                        <p className={`text-[10px] font-black uppercase ${perf?.trackingComplianceRate === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                            {perf?.trackingComplianceRate === 100 ? 'Flawless Compliance' : 'Valid tracking provided'}
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 p-8">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 p-10 rounded-[48px] shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Late Shipment Rate</span>
                        <div className={`text-4xl font-black mb-1 ${perf && perf.lateShipmentRate > 10 ? 'text-red-600' : 'text-black'}`}>
                            {perf ? `${Math.round(perf.lateShipmentRate)}%` : '...'}
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase font-black">Missed ship-by dates</p>
                    </div>
                    <div className="absolute top-0 right-0 p-8">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Section */}
            {perf && perf.badges.length > 0 && (
                <div className="bg-orange-50 p-8 rounded-[40px] border border-orange-100">
                    <h3 className="text-[10px] font-black text-orange-900 uppercase tracking-[0.2em] mb-6">Earned Shipping Badges</h3>
                    <div className="flex flex-wrap gap-4">
                        {perf.badges.map(badge => (
                            <div key={badge} className="bg-white px-6 py-3 rounded-2xl border border-orange-200 shadow-sm flex items-center gap-3">
                                <span className="text-xl">🏆</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">{badge}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 border border-slate-100 p-10 rounded-[48px]">
                    <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">AI Demand Forecast</h3>
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 flex gap-6 items-start">
                        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{demandForecast}"</p>
                            <div className="mt-6 flex gap-3">
                                <span className="text-[10px] font-black text-orange-600 uppercase bg-orange-100 px-3 py-1 rounded-lg">High Value Signal</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Updated 2h ago</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 p-10 rounded-[48px] shadow-sm">
                    <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Seller Reliability Hub</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                             <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-black">S</div>
                             <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase">Successful Shipments</p>
                                 <p className="text-sm font-black text-black uppercase">{perf?.totalShipments || 0} Fully Completed</p>
                             </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl text-[9px] font-medium leading-relaxed uppercase text-slate-400 italic">
                            Performance metrics update every 6 hours based on carrier callback data.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerAnalytics;
