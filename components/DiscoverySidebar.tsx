
import React from 'react';
import { SearchFilters, PlasticFeel, StampType, VerificationTier } from '../types';

interface DiscoverySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
}

const DiscoverySidebar: React.FC<DiscoverySidebarProps> = ({ isOpen, onClose, filters, onFiltersChange }) => {
    const categories = ['Putter', 'Midrange', 'Driver'];
    const plasticFeels = Object.values(PlasticFeel);
    const stampTypes = Object.values(StampType);

    const toggleFilter = (key: keyof SearchFilters, value: any) => {
        const current = filters[key] as any[];
        if (current.includes(value)) {
            onFiltersChange({ ...filters, [key]: current.filter(v => v !== value) });
        } else {
            onFiltersChange({ ...filters, [key]: [...current, value] });
        }
    };

    return (
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className={`absolute left-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`}>
                <div className="p-8">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black text-black tracking-tight uppercase">Filters</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-10">
                        {/* Weight Range */}
                        <section>
                            <div className="flex justify-between mb-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight Range</h3>
                                <span className="text-[10px] font-black text-orange-600">{filters.weightRange[0]}g - {filters.weightRange[1]}g</span>
                            </div>
                            <div className="px-2">
                                <input 
                                    type="range" 
                                    min="130" 
                                    max="180" 
                                    value={filters.weightRange[1]} 
                                    onChange={(e) => onFiltersChange({...filters, weightRange: [filters.weightRange[0], parseInt(e.target.value)]})}
                                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-black" 
                                />
                            </div>
                        </section>

                        {/* Category */}
                        <section>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Class</h3>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => toggleFilter('category', c)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.category.includes(c) ? 'bg-black text-orange-50 border-black' : 'bg-white text-slate-400 border-slate-200 hover:border-black'}`}
                                    >
                                        {c}s
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Plastic Feel */}
                        <section>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Plastic "Feel"</h3>
                            <div className="flex flex-wrap gap-2">
                                {plasticFeels.map(feel => (
                                    <button 
                                        key={feel}
                                        onClick={() => toggleFilter('plasticFeel', feel)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.plasticFeel.includes(feel) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-400 border-slate-200 hover:border-black'}`}
                                    >
                                        {feel}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Stamp Type */}
                        <section>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Stamp Run</h3>
                            <div className="flex flex-wrap gap-2">
                                {stampTypes.map(st => (
                                    <button 
                                        key={st}
                                        onClick={() => toggleFilter('stampType', st)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.stampType.includes(st) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-black'}`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Condition */}
                        <section>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Min. Condition</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {[6, 7, 8, 9, 10].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => onFiltersChange({...filters, conditionMin: c})}
                                        className={`py-2 rounded-xl text-[10px] font-black transition-all border ${filters.conditionMin === c ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-200 hover:border-black'}`}
                                    >
                                        {c}+
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Ink & Verification */}
                        <section>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Trust & Extras</h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => onFiltersChange({...filters, verificationTier: filters.verificationTier === VerificationTier.VerifiedRun ? null : VerificationTier.VerifiedRun})}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${filters.verificationTier === VerificationTier.VerifiedRun ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-100 text-slate-500'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">Verified Run Only</span>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${filters.verificationTier === VerificationTier.VerifiedRun ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                                        {filters.verificationTier === VerificationTier.VerifiedRun && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                    </div>
                                </button>
                                <button 
                                    onClick={() => onFiltersChange({...filters, hasInk: filters.hasInk === false ? null : false})}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${filters.hasInk === false ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-100 text-slate-500'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">No Ink Only</span>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${filters.hasInk === false ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                                        {filters.hasInk === false && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                    </div>
                                </button>
                            </div>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4">
                        <button 
                            onClick={() => onFiltersChange({query: '', brand: [], category: [], plasticFeel: [], stampType: [], weightRange: [130, 180], conditionMin: 1, hasInk: null, verificationTier: null})}
                            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all"
                        >
                            Reset
                        </button>
                        <button 
                            onClick={onClose}
                            className="flex-[2] py-4 bg-black text-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl shadow-black/10"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoverySidebar;
