import React, { useState, useEffect } from 'react';
import {
  User,
  DiscAuction,
  UserReport,
  ReportStatus,
  ReportTargetType,
  ReportCategory,
  ReportSeverity,
  InfraHealth,
} from '../types';
import { db } from '../services/databaseService';
import { obs } from '../services/observabilityService';
import AdminCaseView from './AdminCaseView';
import AdminInfrastructure from './AdminInfrastructure';
import AdminUserDirectory from './AdminUserDirectory';
import AdminListingManager from './AdminListingManager';

interface AdminHubProps {
  currentUser: User;
  auctions: DiscAuction[];
  onReload: () => void;
}

const AdminHub: React.FC<AdminHubProps> = ({ currentUser, auctions, onReload }) => {
  const [view, setView] = useState<'inbox' | 'dashboard' | 'directory' | 'listings' | 'infra'>(
    'dashboard'
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [infra, setInfra] = useState<InfraHealth | null>(null);
  const [filterCategory, setFilterCategory] = useState<ReportCategory | 'All'>('All');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s Heartbeat
    return () => clearInterval(interval);
  }, [onReload, view]);

  const loadData = async () => {
    const [allReports, health] = await Promise.all([db.getReports(), db.getInfraHealth()]);
    setReports(allReports);
    setInfra(health);

    // Automated Alerting Simulation
    if (health.webhooks !== 'Operational' || health.errorRate > 0.3) {
      obs.log('FATAL', { component: 'System', action: 'HighErrorRate', metadata: health });
    }
  };

  const activeReports = reports.filter(
    (r) => r.status !== ReportStatus.Resolved && r.status !== ReportStatus.Dismissed
  );
  const criticalCount = activeReports.filter(
    (r) => r.severity === ReportSeverity.Critical || r.severity === ReportSeverity.High
  ).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 animate-in fade-in duration-500">
      {selectedReportId ? (
        <AdminCaseView
          reportId={selectedReportId}
          currentUser={currentUser}
          onClose={() => {
            setSelectedReportId(null);
            onReload();
          }}
        />
      ) : (
        <div className="space-y-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-slate-900 p-10 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-6xl font-black tracking-tighter uppercase">Mission Control</h1>
                {infra?.webhooks === 'Operational' ? (
                  <span className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/30">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Systems
                    Nominal
                  </span>
                ) : (
                  <span className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/30 animate-bounce">
                    <span className="w-2 h-2 bg-red-500 rounded-full" /> System Degraded
                  </span>
                )}
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                Observability, Enforcement & Product Forensics
              </p>
            </div>

            <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-full relative z-10 overflow-x-auto no-scrollbar">
              {[
                { id: 'dashboard', label: 'Signal Center' },
                { id: 'inbox', label: `Safety Inbox (${activeReports.length})` },
                { id: 'directory', label: 'User Lookup' },
                { id: 'listings', label: 'Nuclear Takedowns' },
                { id: 'infra', label: 'Health' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id as any)}
                  className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${view === t.id ? 'bg-orange-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]" />
          </div>

          {view === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div
                className="bg-white border-2 border-slate-100 p-10 rounded-[48px] shadow-sm group hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => setView('inbox')}
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Unresolved Reports
                </span>
                <div className="text-6xl font-black text-black">{activeReports.length}</div>
                <div className="mt-4 flex gap-2">
                  <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                    {criticalCount} Critical
                  </span>
                </div>
              </div>
              <div
                className="bg-white border-2 border-slate-100 p-10 rounded-[48px] shadow-sm group hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => setView('directory')}
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Unique Hunters
                </span>
                <div className="text-6xl font-black text-black">4,281</div>
                <p className="text-[9px] font-bold text-green-600 uppercase mt-2">
                  ▲ 124 since yesterday
                </p>
              </div>
              <div
                className="bg-white border-2 border-slate-100 p-10 rounded-[48px] shadow-sm group hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => setView('infra')}
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Queue Backlog
                </span>
                <div
                  className={`text-6xl font-black ${infra && infra.queueBacklog > 100 ? 'text-orange-600' : 'text-black'}`}
                >
                  {infra?.queueBacklog || 0}
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">
                  Background Tasks
                </p>
              </div>
              <div
                className="bg-white border-2 border-slate-100 p-10 rounded-[48px] shadow-sm group hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => setView('infra')}
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  API Latency (p99)
                </span>
                <div className="text-6xl font-black text-black">{infra?.apiLatency || '...'}</div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">
                  Global Response Speed
                </p>
              </div>
            </div>
          )}

          {view === 'inbox' && (
            <div className="bg-white border-2 border-slate-100 rounded-[56px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
              <div className="p-8 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="bg-white border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase outline-none"
                >
                  <option value="All">All Categories</option>
                  {Object.values(ReportCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="flex-grow"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeReports.length} Active Safety Signals
                </p>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                {activeReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className="p-10 flex items-center gap-10 hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl shadow-sm ${
                        report.severity === ReportSeverity.Critical
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-black text-white'
                      }`}
                    >
                      {report.targetType === ReportTargetType.User ? '👤' : '📦'}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-lg uppercase tracking-tight">
                          {report.category}
                        </h3>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${report.severity === ReportSeverity.High ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">
                        Ticket {report.ticketId} • Reporter: {report.reporterName}
                      </p>
                    </div>
                    <button className="bg-black text-orange-50 px-6 py-3 rounded-2xl text-[9px] font-black uppercase hover:bg-orange-600">
                      Investigate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'directory' && <AdminUserDirectory />}
          {view === 'listings' && (
            <AdminListingManager auctions={auctions} adminId={currentUser.id} />
          )}
          {view === 'infra' && infra && <AdminInfrastructure health={infra} />}
        </div>
      )}
    </div>
  );
};

export default AdminHub;
