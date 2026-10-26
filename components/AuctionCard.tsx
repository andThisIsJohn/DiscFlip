import React, { useState, useEffect } from 'react';
import { avatarUrl } from '../utils/placeholderArt';
import { DiscAuction, AuctionType, ReportTargetType, User } from '../types';
import SafetyMenu from './SafetyMenu';
import { db } from '../services/databaseService';
import OptimizedImage from './OptimizedImage';

interface AuctionCardProps {
  auction: DiscAuction;
  onClick: (id: string) => void;
  onViewSeller?: (userId: string) => void;
}

const AuctionCard: React.FC<AuctionCardProps> = ({ auction, onClick, onViewSeller }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    db.getCurrentUser().then(setCurrentUser);
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = auction.endTime - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction.endTime]);

  const isEndingSoon = auction.endTime - Date.now() < 1000 * 60 * 60;
  const isMystery = auction.type === AuctionType.MysteryBox;
  const isBag = auction.type === AuctionType.BagBuilder;

  const handleSellerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewSeller) onViewSeller(auction.sellerId);
  };

  return (
    <div
      onClick={() => onClick(auction.id)}
      className={`group bg-white rounded-[32px] shadow-sm border overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 relative flex flex-col h-full ${
        isMystery
          ? 'border-purple-200 ring-2 ring-purple-50'
          : isBag
            ? 'border-blue-200 ring-2 ring-blue-50'
            : 'border-slate-200'
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 flex-shrink-0">
        <OptimizedImage
          src={auction.imageUrl}
          imageSet={auction.imageSet}
          alt={`${auction.brand} ${auction.mold}`}
          className="w-full h-full"
          priority="medium"
        />

        {/* Quick Safety Menu */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            {currentUser && (
              <SafetyMenu
                targetUser={{ id: auction.sellerId, name: auction.seller }}
                targetType={ReportTargetType.Listing}
                targetId={auction.id}
                currentUser={currentUser}
                contextSnapshot={{
                  title: auction.title,
                  brand: auction.brand,
                  seller: auction.seller,
                }}
                onActionComplete={() => window.location.reload()}
                variant="minimal"
                align="left"
              />
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <span
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm ${
              isMystery
                ? 'bg-purple-600 text-white'
                : isBag
                  ? 'bg-blue-600 text-white'
                  : 'bg-black text-white'
            }`}
          >
            {isMystery ? 'MYSTERY PULL' : isBag ? 'BAG BUNDLE' : auction.category}
          </span>
        </div>

        <div className="absolute bottom-4 right-4">
          <span
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
              isEndingSoon
                ? 'bg-orange-600 text-white animate-pulse'
                : 'bg-black/90 text-white backdrop-blur'
            }`}
          >
            {timeLeft}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-grow min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                isMystery ? 'text-purple-600' : isBag ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              {auction.brand}
            </p>
            <h3 className="font-black text-lg text-black leading-tight truncate">{auction.mold}</h3>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-xl font-black text-black tracking-tight">
              ${auction.currentBid}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
          <div
            onClick={handleSellerClick}
            className="flex items-center gap-2 group/seller hover:bg-slate-50 p-1 pr-3 rounded-full transition-all"
          >
            <img
              className="h-6 w-6 rounded-full ring-2 ring-white shadow-sm"
              src={avatarUrl(auction.seller)}
              alt=""
            />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover/seller:text-black">
              {auction.seller}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {auction.bids?.length || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
