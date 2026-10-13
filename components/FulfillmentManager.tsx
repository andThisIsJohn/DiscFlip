import React, { useState, useEffect, useRef } from 'react';
import { DiscAuction, User, ReportTargetType } from '../types';
import { db } from '../services/databaseService';
import LabelPurchaseModal from './LabelPurchaseModal';
import TrackingHub from './TrackingHub';
import OrderIssueModal from './OrderIssueModal';
import PickupScheduler from './PickupScheduler';
import PickupVerification from './PickupVerification';
import SafetyMenu from './SafetyMenu';

interface FulfillmentManagerProps {
  auction: DiscAuction;
  isSeller: boolean;
  onUpdate: () => void;
}

const FulfillmentManager: React.FC<FulfillmentManagerProps> = ({ auction, isSeller, onUpdate }) => {
  const [bundleItems, setBundleItems] = useState<DiscAuction[]>([]);
  const [packingChecklist, setPackingChecklist] = useState({
    correctDisc: false,
    rimInspected: false,
    padded: false,
    sealed: false,
  });
  const [showLabelStudio, setShowLabelStudio] = useState(false);
  const [showTrackingHub, setShowTrackingHub] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [packagingProof, setPackagingProof] = useState<string | null>(
    auction.packagingProofPhoto || null
  );
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const packInputRef = useRef<HTMLInputElement>(null);
  const isPickup = auction.fulfillmentMode === 'pickup';

  useEffect(() => {
    const fetchBundle = async () => {
      if (auction.bundleId) {
        const all = await db.getAuctions();
        const bundle = all.filter((a) => a.bundleId === auction.bundleId);
        setBundleItems(bundle);
      } else {
        setBundleItems([auction]);
      }
      const me = await db.getCurrentUser();
      setCurrentUser(me);
    };
    fetchBundle();
  }, [auction.id, auction.bundleId, auction.status]);

  const getStatuses = () => {
    const baseStatuses = isPickup
      ? [
          {
            id: 'sold',
            label: 'Paid',
            icon: '💰',
            next: isSeller ? 'Await schedule request from buyer.' : 'Schedule a meetup window.',
          },
          {
            id: 'awaiting_scheduling',
            label: 'Unscheduled',
            icon: '📅',
            next: isSeller ? 'Buyer is selecting a time.' : 'Pick a course and time.',
          },
          {
            id: 'pickup_scheduled',
            label: 'Scheduled',
            icon: '🤝',
            next: isSeller ? 'Meet and show QR code to buyer.' : 'Meet and verify the PIN.',
          },
          { id: 'completed', label: 'Exchanged', icon: '✅', next: 'Deal finalized.' },
        ]
      : [
          {
            id: 'sold',
            label: 'Paid',
            icon: '💰',
            next: isSeller ? 'Prepare the disc for shipment.' : 'Seller is packing your plastic.',
          },
          {
            id: 'packed',
            label: 'Packed',
            icon: '📦',
            next: isSeller ? 'Purchase a label to ship.' : 'Seller is creating a label.',
          },
          {
            id: 'label_created',
            label: 'Label Created',
            icon: '🏷️',
            next: isSeller ? 'Drop off at carrier hub.' : 'Awaiting carrier scan.',
          },
          {
            id: 'carrier_scanned',
            label: 'Scanned',
            icon: '🏢',
            next: 'Haul is officially on the move.',
          },
          { id: 'in_transit', label: 'In Transit', icon: '🚚', next: 'Travel in progress.' },
          {
            id: 'delivered',
            label: 'Delivered',
            icon: '🏠',
            next: isSeller ? 'Awaiting buyer inspection.' : 'Verify condition to release funds.',
          },
          {
            id: 'completed',
            label: 'Finalized',
            icon: '✅',
            next: 'Sale closed. Credits released.',
          },
        ];

    if (auction.status === 'disputed') {
      return [
        ...baseStatuses,
        { id: 'disputed', label: 'Disputed', icon: '🚩', next: 'Awaiting admin resolution.' },
      ];
    }
    if (auction.status === 'refunded') {
      return [
        ...baseStatuses,
        { id: 'refunded', label: 'Refunded', icon: '↩️', next: 'Transaction reversed.' },
      ];
    }
    if (auction.status === 'admin_closed') {
      return [
        ...baseStatuses,
        {
          id: 'admin_closed',
          label: 'Admin Closed',
          icon: '⚖️',
          next: 'Closed by administration.',
        },
      ];
    }
    return baseStatuses;
  };

  const statuses = getStatuses();
  const currentIndex = Math.max(
    0,
    statuses.findIndex((s) => s.id === auction.status)
  );

  useEffect(() => {
    // Only the buyer's session can auto-confirm (the database rejects anyone else)
    if (
      !isSeller &&
      auction.status === 'delivered' &&
      auction.confirmationDeadline &&
      !auction.isHighValueHold
    ) {
      const timer = setInterval(() => {
        const now = Date.now();
        const diff = auction.confirmationDeadline! - now;
        if (diff <= 0) {
          db.confirmDelivery(auction.id, 5)
            .then(onUpdate)
            .catch((err) => console.error('Auto-confirm failed', err));
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining(`${hours}h ${mins}m`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [
    isSeller,
    auction.id,
    auction.status,
    auction.confirmationDeadline,
    auction.isHighValueHold,
    onUpdate,
  ]);

  const handleCopyTracking = () => {
    if (auction.trackingNumber) {
      navigator.clipboard.writeText(auction.trackingNumber);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[48px] p-10 shadow-sm animate-in fade-in duration-500">
      {auction.payoutStatus === 'unpaid' && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-[32px]">
          <p className="text-sm font-black uppercase tracking-tight">Waiting for payment</p>
          <p className="text-xs font-medium mt-1">
            {isSeller
              ? 'The auction winner has not paid yet. Do not ship until this order shows as Paid.'
              : 'You won this auction. Use the Pay button in Orders & Sales to check out.'}
          </p>
        </div>
      )}

      {/* Dispute Banner */}
      {auction.status === 'disputed' && (
        <div className="mb-8 p-6 bg-red-600 text-white rounded-[32px] flex items-center justify-between gap-6 shadow-xl animate-bounce">
          <div className="flex items-center gap-6">
            <span className="text-3xl">🚩</span>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">
                Active Resolution Required
              </h3>
              <p className="text-xs font-medium uppercase opacity-80 mt-1">
                This haul is currently under safety review. Funds are locked in vault escrow.
              </p>
            </div>
          </div>
          <span className="bg-white/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/30">
            Admin Oversight Active
          </span>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-black text-black uppercase tracking-tight">
              Order Lifecycle
            </h3>
            <span className="px-3 py-1 bg-black text-orange-50 rounded-lg text-[9px] font-black uppercase">
              #{auction.id.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {auction.isHighValueHold && (
              <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase border border-red-100">
                Escrow Hold
              </span>
            )}
            {auction.status === 'sold' && auction.shipByDate && (
              <span
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${
                  auction.shipByDate - Date.now() < 86400000
                    ? 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}
              >
                Ship By: {new Date(auction.shipByDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {auction.trackingNumber && (
            <button
              onClick={() => setShowTrackingHub(true)}
              className="px-4 py-2 rounded-2xl bg-black text-orange-500 text-[10px] font-black uppercase tracking-widest"
            >
              Track
            </button>
          )}
          {auction.trackingNumber && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 pl-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {auction.labelCarrier}: {auction.trackingNumber}
              </span>
              <button
                onClick={handleCopyTracking}
                className={`p-2 rounded-xl transition-all ${copySuccess ? 'bg-green-600 text-white' : 'bg-white text-slate-400 hover:text-black shadow-sm'}`}
              >
                {copySuccess ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
          {currentUser && (
            <SafetyMenu
              targetUser={
                isSeller
                  ? { id: auction.buyerId!, name: 'Buyer' }
                  : { id: auction.sellerId, name: auction.seller }
              }
              targetType={ReportTargetType.Order}
              targetId={auction.id}
              currentUser={currentUser}
              contextSnapshot={{ orderId: auction.id, mold: auction.mold, status: auction.status }}
              onActionComplete={onUpdate}
            />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-20 px-2">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-600 transition-all duration-1000 ease-out"
            style={{ width: `${(currentIndex / (statuses.length - 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-6">
          {statuses.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center group relative">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm z-10 transition-all duration-500 ${
                  i <= currentIndex
                    ? 'bg-black text-white shadow-xl scale-110'
                    : 'bg-white border-2 border-slate-100 text-slate-300'
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`mt-4 text-[8px] font-black uppercase tracking-widest ${i === currentIndex ? 'text-black' : 'text-slate-300'}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Action Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">
              Order Manifest
            </h4>
            <div className="space-y-4">
              {bundleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm"
                >
                  <img
                    src={item.imageUrl}
                    className="w-14 h-14 rounded-xl object-cover"
                    alt={item.mold}
                  />
                  <div>
                    <p className="font-black text-black uppercase text-[10px]">{item.mold}</p>
                    <p className="text-[9px] font-black text-orange-600">${item.soldPrice}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isSeller && !['completed', 'disputed', 'refunded'].includes(auction.status) && (
            <button
              onClick={() => setShowIssueModal(true)}
              className="w-full py-4 rounded-2xl bg-white border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
            >
              Open Resolution Request
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-black rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden flex-grow flex flex-col justify-center text-center">
            <div className="relative z-10">
              {auction.status === 'disputed' ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">⚖️</span>
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tight">Signal Pending</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-black">
                    Our safety team is reviewing the forensics of this order.
                  </p>
                </div>
              ) : auction.payoutStatus === 'unpaid' ? (
                <div className="space-y-3">
                  <h4 className="text-xl font-black uppercase tracking-tight">Awaiting Payment</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-black">
                    {isSeller
                      ? 'Hold the disc until the winner pays.'
                      : 'Pay from Orders & Sales to lock in your win.'}
                  </p>
                </div>
              ) : isSeller ? (
                <div className="space-y-4">
                  {!isPickup && auction.status === 'sold' && (
                    <>
                      <div className="text-left space-y-2">
                        {(
                          [
                            ['correctDisc', 'Correct disc, matches photos'],
                            ['rimInspected', 'Rim and flight plate inspected'],
                            ['padded', 'Padded / protected'],
                            ['sealed', 'Package sealed'],
                          ] as const
                        ).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-300"
                          >
                            <input
                              type="checkbox"
                              className="accent-orange-500"
                              checked={packingChecklist[key]}
                              onChange={(e) =>
                                setPackingChecklist({
                                  ...packingChecklist,
                                  [key]: e.target.checked,
                                })
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <input
                        ref={packInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setPackagingProof(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                      <button
                        onClick={() => packInputRef.current?.click()}
                        className="w-full py-3 rounded-[20px] border border-white/20 text-[10px] font-black uppercase tracking-widest hover:border-white"
                      >
                        {packagingProof ? 'Packing photo added ✓' : 'Add packing photo (optional)'}
                      </button>
                      <button
                        disabled={!Object.values(packingChecklist).every(Boolean)}
                        onClick={() =>
                          db
                            .markAsPacked(auction.id, packagingProof || '')
                            .then(onUpdate)
                            .catch((err) => alert(err.message))
                        }
                        className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl disabled:opacity-30"
                      >
                        Mark as Packed
                      </button>
                    </>
                  )}
                  {!isPickup && auction.status === 'packed' && (
                    <button
                      onClick={() => setShowLabelStudio(true)}
                      className="w-full bg-orange-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl"
                    >
                      Purchase Platform Label
                    </button>
                  )}
                  {isPickup && ['sold', 'awaiting_scheduling'].includes(auction.status) && (
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      Waiting for the buyer to pick a meetup time.
                    </p>
                  )}
                  {isPickup && auction.status === 'pickup_scheduled' && (
                    <>
                      <p className="text-[10px] text-slate-300 uppercase font-black">
                        {auction.pickupDetails?.location} • {auction.pickupDetails?.timeWindow}
                      </p>
                      <button
                        onClick={() => setShowVerification(true)}
                        className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl"
                      >
                        Show Hand-off PIN
                      </button>
                    </>
                  )}
                  {auction.status === 'delivered' && (
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      Delivered. Waiting for the buyer to confirm
                      {timeRemaining ? ` (auto-confirms in ${timeRemaining})` : ''}.
                    </p>
                  )}
                  {auction.status === 'completed' && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto text-green-500 text-3xl">
                        ✅
                      </div>
                      <h4 className="text-xl font-black uppercase text-green-500">
                        Haul Finalized
                      </h4>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!isPickup && ['sold', 'packed'].includes(auction.status) && (
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      The seller is packing your disc.
                    </p>
                  )}
                  {isPickup &&
                    ['sold', 'awaiting_scheduling', 'pickup_scheduled'].includes(
                      auction.status
                    ) && (
                      <button
                        onClick={() => setShowScheduler(true)}
                        className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-widest"
                      >
                        {auction.status === 'pickup_scheduled'
                          ? 'Change Meetup'
                          : 'Schedule Pickup'}
                      </button>
                    )}
                  {isPickup && auction.status === 'pickup_scheduled' && (
                    <>
                      <p className="text-[10px] text-slate-300 uppercase font-black">
                        {auction.pickupDetails?.location} • {auction.pickupDetails?.timeWindow}
                      </p>
                      <button
                        onClick={() => setShowVerification(true)}
                        className="w-full bg-orange-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest"
                      >
                        Enter Seller&apos;s PIN
                      </button>
                    </>
                  )}
                  {auction.status === 'delivered' && (
                    <>
                      <button
                        onClick={() =>
                          db
                            .confirmDelivery(auction.id, 5)
                            .then(onUpdate)
                            .catch((err) => alert(err.message))
                        }
                        className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-widest"
                      >
                        Verify & Release Credits
                      </button>
                      {timeRemaining && (
                        <p className="text-[10px] text-slate-400 uppercase font-black">
                          Auto-confirms in {timeRemaining}
                        </p>
                      )}
                    </>
                  )}
                  {auction.status === 'completed' && (
                    <div className="space-y-4 text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">
                        ✓
                      </div>
                      <h4 className="text-xl font-black uppercase text-white">Deal Closed</h4>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLabelStudio && (
        <LabelPurchaseModal
          auction={auction}
          onClose={() => setShowLabelStudio(false)}
          onSuccess={() => {
            setShowLabelStudio(false);
            onUpdate();
          }}
        />
      )}
      {showTrackingHub && (
        <TrackingHub
          auction={auction}
          onClose={() => setShowTrackingHub(false)}
          onUpdate={onUpdate}
        />
      )}
      {showScheduler && (
        <PickupScheduler
          auction={auction}
          onClose={() => setShowScheduler(false)}
          onSubmit={async (details) => {
            try {
              await db.schedulePickup(auction.id, details);
              setShowScheduler(false);
              onUpdate();
            } catch (err: any) {
              alert(err.message);
            }
          }}
        />
      )}
      {showVerification && (
        <PickupVerification
          auction={auction}
          isSeller={isSeller}
          onClose={() => setShowVerification(false)}
          onVerify={async (pin) => {
            const ok = await db.completePickup(auction.id, pin);
            if (ok) {
              setShowVerification(false);
              onUpdate();
            }
            return ok;
          }}
        />
      )}
      {showIssueModal && (
        <OrderIssueModal
          auction={auction}
          onClose={() => setShowIssueModal(false)}
          onSubmit={async (d) => {
            await db.reportOrderIssue(auction.id, d);
            setShowIssueModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default FulfillmentManager;
