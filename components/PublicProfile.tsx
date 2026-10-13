import React, { useState, useEffect } from 'react';
import {
  User,
  DiscAuction,
  TradeOffer,
  DiscClub,
  DiscVisibility,
  DiscLocation,
  SellerPerformance,
  ReportTargetType,
} from '../types';
import { db } from '../services/databaseService';
import TradeManager from './TradeManager';
import AuctionCard from './AuctionCard';
import SafetyMenu from './SafetyMenu';

interface PublicProfileProps {
  user: User;
  auctions: DiscAuction[];
  currentUser: User;
  onClose: () => void;
  onReload?: () => void;
  onMessageUser: (targetUser: User) => void;
}

const PublicProfile: React.FC<PublicProfileProps> = ({
  user,
  auctions,
  currentUser,
  onClose,
  onReload,
  onMessageUser,
}) => {
  const [tab, setTab] = useState<'listings' | 'sold' | 'collection' | 'history' | 'bundle'>(
    'listings'
  );
  const [showTradeManager, setShowTradeManager] = useState(false);
  const [, setUserClubs] = useState<DiscClub[]>([]);
  const [perf, setPerf] = useState<SellerPerformance | null>(null);

  const isFavorited = currentUser.favoriteUserIds?.includes(user.id);
  const isBlocked = currentUser.blockedUserIds?.includes(user.id);

  useEffect(() => {
    db.getClubs().then((allClubs) => {
      const joined = allClubs.filter((c) => c.memberIds.includes(user.id));
      setUserClubs(joined);
    });
    db.calculateSellerPerformance(user.id).then(setPerf);
  }, [user.id]);

  const activeListings = auctions.filter((a) => a.sellerId === user.id && a.status === 'active');

  const fullCollection = (user.inventory || []).filter((d) => {
    if (d.visibility === DiscVisibility.Private) return false;
    if (d.visibility === DiscVisibility.Friends && !currentUser.followingIds.includes(user.id))
      return false;
    return true;
  });

  const soldItems = auctions.filter(
    (a) =>
      a.sellerId === user.id &&
      (a.status === 'sold' ||
        a.status === 'shipped' ||
        a.status === 'delivered' ||
        a.status === 'completed')
  );

  const handleProposeTrade = async (offer: Partial<TradeOffer>) => {
    try {
      await db.createTradeOffer(offer);
      setShowTradeManager(false);
      alert('Trade proposal sent to ' + user.name + '! Check your Trade Hub for updates.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleFavorite = async () => {
    await db.toggleFavorite(currentUser.id, user.id);
    if (onReload) onReload();
  };

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 flex items-center justify-center p-6 animate-in fade-in">
        <div className="max-w-md w-full bg-white rounded-[48px] p-12 text-center shadow-xl border border-slate-100">
          <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
            🚫
          </div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tight mb-4">
            User Blocked
          </h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] leading-relaxed mb-10 tracking-widest">
            You have blocked this hunter. Profiles and interactions are restricted to maintain your
            safety.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                await db.unblockUser(currentUser.id, user.id);
                if (onReload) onReload();
              }}
              className="bg-black text-orange-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-orange-600 hover:text-white transition-all"
            >
              Unblock {user.name}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 font-black uppercase text-[10px] tracking-widest py-2"
            >
              Return to Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-orange-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Marketplace
          </button>
          <div className="flex gap-2">
            <SafetyMenu
              targetUser={user}
              targetType={ReportTargetType.User}
              targetId={user.id}
              currentUser={currentUser}
              contextSnapshot={{
                userName: user.name,
                userHandle: user.handle,
                sales: user.totalSales,
                avatar: user.avatar,
              }}
              onActionComplete={() => onReload?.()}
            />
          </div>
        </div>

        <div className="bg-white rounded-[48px] p-8 md:p-12 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-40 h-40 rounded-[32px] object-cover ring-8 ring-slate-50 shadow-xl"
            />
            {user.isIdentityVerified && (
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-4 border-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-grow">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
              <h1 className="text-4xl font-black text-black tracking-tighter uppercase">
                {user.name}
              </h1>
              <span className="text-xs font-black text-orange-600 uppercase tracking-widest">
                @{user.handle}
              </span>
            </div>
            <div className="flex gap-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>{user.followerCount} Followers</span>
              <span>{user.totalSales} Sales</span>
              <span className="text-orange-600 font-black">
                {fullCollection.length} Discs in Vault
              </span>
            </div>

            {/* Shipping Badges */}
            {perf && perf.badges.length > 0 && (
              <div className="flex gap-2 mb-4">
                {perf.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 bg-black text-orange-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-400/20 shadow-lg"
                  >
                    {badge === 'Fast Shipper' ? '⚡ ' : badge === 'Tracking Always' ? '📍 ' : '🛡️ '}
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <p className="text-slate-500 mb-6 font-medium italic max-w-xl">
              &quot;{user.bio || 'Chasing chains and picking up plastic.'}&quot;
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all ${isFavorited ? 'bg-orange-500 text-white' : 'bg-black text-orange-500 hover:bg-orange-600 hover:text-white'}`}
              >
                <svg
                  className={`w-4 h-4 ${isFavorited ? 'fill-current' : 'fill-none'}`}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {isFavorited ? 'VIP Partner' : 'Add to VIP List'}
              </button>
              <button
                onClick={() => onMessageUser(user)}
                className="bg-slate-100 text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black hover:text-orange-500 transition-all shadow-xl active:scale-95"
              >
                Message
              </button>
              <button
                onClick={() => setShowTradeManager(true)}
                className="bg-slate-100 text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black hover:text-orange-500 transition-all active:scale-95 shadow-xl"
              >
                Propose Trade
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[40px] p-8 text-black w-full md:w-64 text-center border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
              Market Standing
            </span>
            <div className="text-4xl font-black mb-1 text-orange-600">{user.rating} ★</div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
              Trusted Member
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
          <div className="flex border-b border-slate-100 p-2 bg-slate-50/50 overflow-x-auto no-scrollbar">
            {[
              { id: 'listings', label: 'Active Storefront', count: activeListings.length },
              { id: 'collection', label: 'The Vault', count: fullCollection.length },
              { id: 'history', label: 'Trade Track Record', count: soldItems.length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex-1 min-w-[160px] py-5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all rounded-[32px] ${
                  tab === t.id
                    ? 'text-orange-600 bg-white shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-400 hover:text-black'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[8px] font-black text-slate-500">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-12">
            {tab === 'listings' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                {activeListings.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} onClick={() => {}} />
                ))}
                {activeListings.length === 0 && (
                  <div className="col-span-full py-24 text-center">
                    <p className="text-slate-400 font-black uppercase text-xs italic">
                      Storefront is currently empty.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'collection' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in">
                {fullCollection.map((disc, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-white border border-slate-100 rounded-[40px] p-6 hover:shadow-xl transition-all duration-500 flex flex-col"
                  >
                    <div className="aspect-square rounded-[32px] overflow-hidden mb-6 bg-slate-50 relative">
                      <img
                        src={disc.imageUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt=""
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {disc.isForTrade && (
                          <span className="bg-orange-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-lg">
                            Tradeable
                          </span>
                        )}
                        {disc.location === DiscLocation.Bag && (
                          <span className="bg-black text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                            In Bag
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-black text-black text-xl leading-tight mb-1 truncate uppercase">
                      {disc.mold}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">
                      {disc.brand} • {disc.plastic}
                    </p>
                    <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        {disc.weight}g
                      </span>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        {disc.condition}/10
                      </span>
                    </div>
                  </div>
                ))}
                {fullCollection.length === 0 && (
                  <div className="col-span-full py-24 text-center">
                    <p className="text-slate-400 font-black uppercase text-xs italic">
                      Vault contains no public plastic.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in">
                {soldItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100"
                  >
                    <img
                      src={item.imageUrl}
                      className="w-16 h-16 rounded-2xl object-cover shadow-sm"
                      alt=""
                    />
                    <div className="flex-grow">
                      <p className="font-black text-black text-sm uppercase tracking-tighter">
                        {item.mold}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {item.plastic} • {item.brand}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-orange-600">
                        ${item.soldPrice || item.currentBid}
                      </p>
                      <span className="text-[8px] font-black text-green-600 uppercase">
                        Successful Trade
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showTradeManager && (
        <TradeManager
          currentUser={currentUser}
          targetUser={user}
          onClose={() => setShowTradeManager(false)}
          onSubmit={handleProposeTrade}
        />
      )}
    </div>
  );
};

export default PublicProfile;
