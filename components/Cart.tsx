import React from 'react';
import { CartItem } from '../types';

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  isOpen: boolean;
}

const Cart: React.FC<CartProps> = ({ items, onClose, onRemove, onCheckout, isOpen }) => {
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-black uppercase tracking-tight">Your Haul</h2>
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs font-black">
                {items.length}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-black">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                  Your cart is empty
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.auctionId}
                  className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                >
                  <img src={item.imageUrl} className="w-20 h-20 rounded-xl object-cover" alt="" />
                  <div className="flex-grow">
                    <p className="text-[10px] font-black text-orange-600 uppercase mb-1">
                      {item.type.replace('_', ' ')}
                    </p>
                    <h4 className="font-bold text-black text-sm line-clamp-1">{item.title}</h4>
                    <p className="text-lg font-black text-black">${item.price}</p>
                  </div>
                  <button
                    onClick={() => onRemove(item.auctionId)}
                    className="text-slate-300 hover:text-red-500 transition-colors self-start"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Subtotal</span>
              <span className="text-xl font-black text-black">${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">
              Shipping and taxes calculated at checkout.
            </p>
            <button
              disabled={items.length === 0}
              onClick={onCheckout}
              className="w-full bg-black text-orange-500 py-4 rounded-2xl font-black text-lg hover:bg-orange-600 hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              Secure Checkout
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Secure Payments Verified
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
