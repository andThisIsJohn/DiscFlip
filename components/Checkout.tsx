import React, { useState, useEffect } from 'react';
import {
  CartItem,
  User,
  ShippingOption,
  DiscAuction,
  ShippingAddress,
  ShippingServiceType,
} from '../types';
import { db } from '../services/databaseService';
import { payments } from '../services/paymentService';
import { config } from '../services/config';
import AddressForm from './AddressForm';

interface CheckoutProps {
  items: CartItem[];
  user: User;
  onUserUpdated?: (user: User) => void;
  onComplete: (total: number, updatedItems: CartItem[]) => void;
  onClose: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ items, user, onUserUpdated, onComplete, onClose }) => {
  const [addresses, setAddresses] = useState<ShippingAddress[]>(user.shippingAddresses || []);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auctions, setAuctions] = useState<Record<string, DiscAuction>>({});
  const [sellers, setSellers] = useState<Record<string, User>>({});

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    (user.shippingAddresses || []).find((a) => a.isDefault)?.id ||
      user.shippingAddresses?.[0]?.id ||
      ''
  );
  const [showNewAddress, setShowNewAddress] = useState(false);

  const [fulfillmentChoices, setFulfillmentChoices] = useState<
    Record<
      string,
      {
        mode: 'shipping' | 'pickup';
        service: ShippingServiceType;
        note: string;
        insurance: boolean;
        signature: boolean;
      }
    >
  >({});

  useEffect(() => {
    const fetchData = async () => {
      const allAuctions = await db.getAuctions();
      const allUsers = await db.getUsers();
      const auctionMap: Record<string, DiscAuction> = {};
      const sellerMap: Record<string, User> = {};
      const initialFulfillment: Record<string, any> = {};

      items.forEach((item) => {
        const foundAuction = allAuctions.find((a) => a.id === item.auctionId);
        const foundSeller = allUsers.find((u) => u.id === item.sellerId);

        if (foundAuction) {
          auctionMap[item.auctionId] = foundAuction;
          initialFulfillment[item.auctionId] = {
            mode: foundAuction.shippingOption === ShippingOption.PickupOnly ? 'pickup' : 'shipping',
            service: ShippingServiceType.Standard,
            note: '',
            insurance: foundAuction.currentBid >= 100,
            signature: foundAuction.currentBid >= 400,
          };
        }
        if (foundSeller) sellerMap[item.sellerId] = foundSeller;
      });
      setAuctions(auctionMap);
      setSellers(sellerMap);
      setFulfillmentChoices(initialFulfillment);
    };
    fetchData();
  }, [items]);

  const itemsBySeller: Record<string, CartItem[]> = {};
  items.forEach((item) => {
    if (!itemsBySeller[item.sellerId]) itemsBySeller[item.sellerId] = [];
    itemsBySeller[item.sellerId].push(item);
  });

  // Must match api/payments/checkout.ts: each shipped item is charged its listing's shipping
  // price; local pickup is free. No buyer fee (the seller's 10% comes out of their payout).
  const itemShipping = (item: CartItem) => {
    if (fulfillmentChoices[item.auctionId]?.mode === 'pickup') return 0;
    const auction = auctions[item.auctionId];
    return Number(auction?.shippingPrice || auction?.shippingCost || 0);
  };

  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const shippingTotal = items.reduce((acc, item) => acc + itemShipping(item), 0);
  const total = subtotal + shippingTotal;

  const handleProcess = async () => {
    setIsProcessing(true);
    const finalItems = items.map((item) => ({
      ...item,
      fulfillment: fulfillmentChoices[item.auctionId].mode,
      insuranceOpted: fulfillmentChoices[item.auctionId].insurance,
      signatureRequired: fulfillmentChoices[item.auctionId].signature,
    }));

    const shippingAddress = addresses.find((a) => a.id === selectedAddressId);
    try {
      // Live mode: this sends the browser to Stripe's payment page and doesn't return.
      await payments.createCheckoutSession(user.id, finalItems, shippingAddress);
      if (config.isMockEnabled) {
        // Mock mode: simulate Stripe confirming the payment
        setTimeout(() => {
          onComplete(total, finalItems);
        }, 2500);
      }
    } catch (e: any) {
      alert(`Payment couldn't start: ${e?.message || 'unknown error'}`);
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xl">
        <div className="text-center text-white p-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">
            Securing Your Haul...
          </h2>
          <p className="text-orange-400 animate-pulse font-black uppercase text-[10px] tracking-widest">
            Handshaking with Stripe Connect Vault
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-6xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-300 max-h-[90vh]">
        <div className="flex-grow p-8 md:p-14 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${step >= i ? 'bg-black text-orange-50' : 'bg-slate-100 text-slate-400'}`}
                >
                  {i}
                </div>
                {i < 3 && (
                  <div
                    className={`h-1 w-12 rounded-full ${step > i ? 'bg-black' : 'bg-slate-100'}`}
                  ></div>
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
              <section>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-black tracking-tight uppercase">
                    Destination
                  </h2>
                  <button
                    onClick={() => setShowNewAddress(!showNewAddress)}
                    className="text-orange-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                  >
                    Add New
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.length === 0 && !showNewAddress && (
                    <button
                      onClick={() => setShowNewAddress(true)}
                      className="p-6 rounded-[32px] border-2 border-dashed border-slate-200 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-orange-500 hover:text-orange-600 transition-all"
                    >
                      + Add a shipping address to continue
                    </button>
                  )}
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-black bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      <p className="font-bold text-sm text-black">{addr.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{addr.street}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {addr.city}, {addr.state} {addr.zip}
                      </p>
                    </div>
                  ))}
                </div>
                {showNewAddress && (
                  <div className="mt-4">
                    <AddressForm
                      defaultName={user.name}
                      makeDefault={addresses.length === 0}
                      onCancel={() => setShowNewAddress(false)}
                      onSave={async (addr) => {
                        const updated = [...addresses, addr];
                        const updatedUser = { ...user, shippingAddresses: updated };
                        await db.updateUser(updatedUser);
                        onUserUpdated?.(updatedUser);
                        setAddresses(updated);
                        setSelectedAddressId(addr.id);
                        setShowNewAddress(false);
                      }}
                    />
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-xl font-black text-black tracking-tight uppercase mb-8">
                  Shipping & Protection
                </h2>
                <div className="space-y-12">
                  {Object.entries(itemsBySeller).map(([sellerId, sellerItems]) => {
                    const seller = sellers[sellerId];
                    return (
                      <div key={sellerId} className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4">
                          From {seller?.name}
                        </h3>
                        <div className="space-y-4">
                          {sellerItems.map((item) => {
                            const auction = auctions[item.auctionId];
                            const choice = fulfillmentChoices[item.auctionId];
                            if (!auction || !choice) return null;
                            return (
                              <div
                                key={item.auctionId}
                                className="p-8 bg-slate-50 rounded-[40px] border border-slate-100"
                              >
                                <div className="flex items-center gap-4 mb-8">
                                  <img
                                    src={item.imageUrl}
                                    className="w-16 h-16 rounded-2xl object-cover"
                                    alt=""
                                  />
                                  <div>
                                    <h4 className="font-black text-black text-sm uppercase">
                                      {item.title}
                                    </h4>
                                    <p className="text-lg font-black text-orange-600">
                                      ${item.price}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                      Delivery Mode
                                    </label>
                                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
                                      <button
                                        onClick={() =>
                                          setFulfillmentChoices({
                                            ...fulfillmentChoices,
                                            [item.auctionId]: { ...choice, mode: 'shipping' },
                                          })
                                        }
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${choice.mode === 'shipping' ? 'bg-black text-white' : 'text-slate-400'}`}
                                      >
                                        Shipping
                                      </button>
                                      {auction.shippingOption !== ShippingOption.ShippingOnly && (
                                        <button
                                          onClick={() =>
                                            setFulfillmentChoices({
                                              ...fulfillmentChoices,
                                              [item.auctionId]: { ...choice, mode: 'pickup' },
                                            })
                                          }
                                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${choice.mode === 'pickup' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
                                        >
                                          Pickup
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <button
                disabled={!selectedAddressId}
                onClick={() => setStep(2)}
                className="w-full bg-black text-orange-50 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all disabled:opacity-30"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
              <h2 className="text-3xl font-black text-black tracking-tight uppercase">
                Payment Vault
              </h2>
              <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                <div className="p-8 rounded-[32px] border-2 border-orange-600 bg-white shadow-xl flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-orange-500 font-black text-lg">
                      S
                    </div>
                    <div>
                      <p className="font-black text-black uppercase text-sm">
                        Stripe Hosted Checkout
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Cards, Apple Pay, Google Pay
                      </p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-orange-600 flex items-center justify-center">
                    <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-black text-orange-50 py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl"
                >
                  Review Secured Order
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
              <div>
                <h2 className="text-3xl font-black text-black tracking-tight uppercase mb-2">
                  Review Haul
                </h2>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
                  Final confirmation before Stripe redirection
                </p>
              </div>
              <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 space-y-6">
                <div className="flex justify-between font-black uppercase text-[10px] tracking-widest">
                  <span className="text-slate-400">Items Subtotal</span>
                  <span className="text-black">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black uppercase text-[10px] tracking-widest">
                  <span className="text-slate-400">Shipping</span>
                  <span className="text-black">${shippingTotal.toFixed(2)}</span>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  No buyer fees. Payment is held securely until you confirm your disc arrived.
                </p>
                <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xl font-black text-black uppercase tracking-tighter">
                    Total Due
                  </span>
                  <span className="text-4xl font-black text-orange-600 tracking-tighter">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]"
                >
                  Back
                </button>
                <button
                  onClick={handleProcess}
                  className="flex-[2] bg-orange-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl active:scale-95"
                >
                  Initiate Payment
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full md:w-[450px] bg-slate-50 p-10 md:p-14 border-l border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-black uppercase tracking-widest text-xs">Summary</h3>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-black p-2 hover:bg-white rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-6 flex-grow overflow-y-auto custom-scrollbar pr-4 mb-10">
            {items.map((item) => (
              <div
                key={item.auctionId}
                className="flex gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm"
              >
                <img src={item.imageUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                <div>
                  <p className="text-sm font-black text-black uppercase truncate">{item.title}</p>
                  <p className="text-xs font-black text-orange-600">${item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
