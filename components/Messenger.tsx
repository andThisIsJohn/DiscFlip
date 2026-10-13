import React, { useState, useEffect } from 'react';
import { User, Thread } from '../types';
import { db } from '../services/databaseService';
import ConversationThread from './ConversationThread';

interface MessengerProps {
  currentUser: User;
  initialThreadId?: string | null;
}

const Messenger: React.FC<MessengerProps> = ({ currentUser, initialThreadId }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId || null);
  const [filter, setFilter] = useState<'active' | 'requests'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadThreads();
  }, [filter]);

  const loadThreads = async () => {
    const list = await db.getThreads(currentUser.id);
    setThreads(list);
  };

  const filteredThreads = threads.filter((t) => {
    if (filter === 'active' && t.isSpamRequest) return false;
    if (filter === 'requests' && !t.isSpamRequest) return false;
    if (searchTerm && !t.objectTitle.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const requestCount = threads.filter((t) => t.isSpamRequest).length;

  const getThreadTypeBadge = (type: string) => {
    const base = 'px-2 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest ml-auto ';
    switch (type) {
      case 'order':
        return base + 'bg-green-100 text-green-700';
      case 'listing':
        return base + 'bg-orange-100 text-orange-700';
      case 'bounty':
        return base + 'bg-blue-100 text-blue-700';
      case 'club':
        return base + 'bg-indigo-100 text-indigo-700';
      default:
        return base + 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex-grow flex bg-white border border-slate-200 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl animate-in fade-in duration-500 min-h-0">
      {/* Thread List Sidebar */}
      <div
        className={`${selectedThreadId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-slate-100 flex-col bg-slate-50/50 min-h-0`}
      >
        <div className="p-8 border-b border-slate-100 bg-white flex-shrink-0">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-6">
            Messenger
          </h2>
          <div className="relative mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search discussions..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-white text-black shadow-sm' : 'text-slate-400'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('requests')}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${filter === 'requests' ? 'bg-white text-black shadow-sm' : 'text-slate-400'}`}
            >
              Requests
              {requestCount > 0 && <span className="ml-1 text-orange-600">({requestCount})</span>}
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar min-h-0">
          {filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  db.markThreadAsRead(thread.id, currentUser.id);
                  loadThreads();
                }}
                className={`p-6 border-b border-slate-100 cursor-pointer transition-all hover:bg-white flex gap-4 relative group ${selectedThreadId === thread.id ? 'bg-white border-l-4 border-l-orange-600' : 'bg-transparent'}`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={thread.objectImage}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                    alt=""
                  />
                  {thread.unreadCount[currentUser.id] > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 text-white rounded-full text-[8px] font-black flex items-center justify-center ring-2 ring-white animate-bounce">
                      {thread.unreadCount[currentUser.id]}
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4
                      className={`text-[11px] font-black uppercase truncate ${thread.unreadCount[currentUser.id] > 0 ? 'text-black' : 'text-slate-600'}`}
                    >
                      {thread.objectTitle}
                    </h4>
                    <span className="text-[8px] font-black text-slate-300 uppercase whitespace-nowrap ml-2">
                      {new Date(thread.lastTimestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[10px] truncate max-w-[70%] ${thread.unreadCount[currentUser.id] > 0 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}
                    >
                      {thread.lastMessage || 'Start a discussion...'}
                    </p>
                    <span className={getThreadTypeBadge(thread.type)}>{thread.type}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center px-8">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {filter === 'active' ? 'No active conversations' : 'No message requests'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active Thread View */}
      <div
        className={`${selectedThreadId ? 'flex' : 'hidden md:flex'} flex-grow flex flex-col bg-white min-h-0`}
      >
        {selectedThread ? (
          <ConversationThread
            thread={selectedThread}
            currentUser={currentUser}
            onUpdate={() => {
              loadThreads();
            }}
            onBack={() => setSelectedThreadId(null)}
          />
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-slate-50/20 min-h-0">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-slate-200">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-black text-black uppercase tracking-tight">
              Select a Conversation
            </h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">
              Discuss plastic, negotiate offers, or track deliveries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger;
