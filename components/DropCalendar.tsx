
import React from 'react';
import { DropEvent } from '../types';

interface DropCalendarProps {
    drops: DropEvent[];
}

const DropCalendar: React.FC<DropCalendarProps> = ({ drops }) => {
    return (
        <div className="space-y-12 py-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-5xl font-black text-black tracking-tighter uppercase mb-2">Hype Calendar</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Don't miss the next hand-bangin' release</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1">Active Reminders</span>
                    <span className="text-3xl font-black text-black">12.4K</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {drops.map(drop => {
                    const date = new Date(drop.releaseDate);
                    return (
                        <div key={drop.id} className="group relative bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500">
                            <div className="aspect-[16/9] overflow-hidden relative">
                                <img src={drop.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <span className="bg-black text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    {drop.isCharity && (
                                        <span className="bg-pink-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                            Charity Drop
                                        </span>
                                    )}
                                </div>
                                <div className="absolute bottom-6 right-6">
                                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hype Score</span>
                                        <span className="text-lg font-black text-black">{drop.hypeCount} 🔥</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">{drop.brand}</p>
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-tight">{drop.plastic} {drop.mold}</h3>
                                    </div>
                                    <button className="bg-black text-orange-500 p-4 rounded-3xl hover:bg-orange-600 hover:text-white transition-all shadow-xl">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    </button>
                                </div>
                                <p className="text-slate-500 font-medium mb-8 leading-relaxed italic">"{drop.description}"</p>
                                <div className="flex gap-4">
                                    <button className="flex-1 border-2 border-black text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all">View Specs</button>
                                    <button className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl">Find Retailers</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DropCalendar;
