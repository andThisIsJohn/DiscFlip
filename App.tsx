import React, { useState, useEffect, useCallback } from 'react';
import {
  DiscAuction,
  User,
  CartItem,
  SearchFilters,
  AppNotification,
  AppNotificationType,
} from './types';
import { db } from './services/databaseService';
import { auth } from './services/authService';
import { obs } from './services/observabilityService';
import AuctionCard from './components/AuctionCard';
import AuctionDetail from './components/AuctionDetail';
import CreateAuction from './components/CreateAuction';
import AccountDashboard from './components/AccountDashboard';
import PublicProfile from './components/PublicProfile';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import BountyHub from './components/BountyHub';
import NotificationHub from './components/NotificationHub';
import ClubHub from './components/ClubHub';
import AddFundsModal from './components/AddFundsModal';
import UserSearchHub from './components/UserSearchHub';
import Messenger from './components/Messenger';
import AdminHub from './components/AdminHub';
import SafetyOnboarding from './components/SafetyOnboarding';
import LegalOnboarding from './components/LegalOnboarding';
import { payments } from './services/paymentService';
import { config } from './services/config';
import { onInstallAvailability, promptInstall, isIosSafari } from './services/pwa';

type MainView =
  | 'home'
  | 'account'
  | 'wantlist'
  | 'clubs'
  | 'community'
  | 'messenger'
  | 'admin'
  | 'auth';

const App: React.FC = () => {
  const [auctions, setAuctions] = useState<DiscAuction[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('discflip_cart');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const viewedUser = allUsers.find((u) => u.id === viewedUserId);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [showSafetyOnboarding, setShowSafetyOnboarding] = useState(false);
  const [showLegalOnboarding, setShowLegalOnboarding] = useState(false);

  const [currentView, setCurrentView] = useState<MainView>('home');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authForm, setAuthForm] = useState({ email: '', pass: '', name: '' });

  const [filters] = useState<SearchFilters>({
    query: '',
    brand: [],
    category: [],
    plasticFeel: [],
    stampType: [],
    weightRange: [130, 180],
    conditionMin: 1,
    hasInk: null,
    verificationTier: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const showIosInstallTip = isIosSafari();

  useEffect(() => onInstallAvailability(setCanInstall), []);

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (showIosInstallTip) {
      alert('To install DiscFlip: tap the Share button in Safari, then "Add to Home Screen".');
    }
  };

  // Keep the cart across reloads (and across the round trip to Stripe's payment page)
  useEffect(() => {
    try {
      localStorage.setItem('discflip_cart', JSON.stringify(cart));
    } catch {
      /* storage full or blocked */
    }
  }, [cart]);

  // Refreshes data in place. Only the very first load shows the full-screen spinner
  // (isLoading starts true), so refreshing doesn't throw you out of the screen you're on.
  const loadData = useCallback(async () => {
    try {
      const [fetchedAuctions, fetchedUsers, currentUser] = await Promise.all([
        db.getAuctions(),
        db.getUsers(),
        auth.getSessionUser(),
      ]);
      setAuctions(fetchedAuctions || []);
      setAllUsers(fetchedUsers || []);
      setUser(currentUser);

      // SYNC SENTRY CONTEXT
      if (currentUser) {
        obs.setUserContext(currentUser.id, currentUser.email);
      }

      if (currentUser && !currentUser.hasAcceptedLegalTerms) {
        setShowLegalOnboarding(true);
      } else if (currentUser && !currentUser.hasSeenSafetyOnboarding) {
        setShowSafetyOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to load DB data:', error);
      obs.captureException(error as Error, { action: 'initial_load' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = auth.onAuthStateChange((newUser) => {
      setUser(newUser);
      if (newUser) {
        obs.setUserContext(newUser.id, newUser.email);
        if (!newUser.hasAcceptedLegalTerms) setShowLegalOnboarding(true);
        else if (!newUser.hasSeenSafetyOnboarding) setShowSafetyOnboarding(true);
      } else {
        setCurrentView((v) =>
          ['account', 'messenger', 'admin', 'clubs', 'wantlist', 'community'].includes(v)
            ? 'home'
            : v
        );
      }
    });
    const worker = setInterval(async () => {
      try {
        await db.processAuctionEndings();
        const updatedAuctions = await db.getAuctions();
        setAuctions(updatedAuctions);
      } catch (err) {
        console.error('Auction refresh failed:', err);
      }
    }, 10000);
    return () => {
      clearInterval(worker);
      unsubscribe();
    };
  }, [loadData]);

  // Coming back from Stripe (checkout or seller onboarding)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const stripeReturn = params.get('stripe');
    if (!checkout && !stripeReturn) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (checkout === 'success') {
      setCart([]);
      setCurrentView('account');
      alert('Payment received! The seller has been notified. Track it in Account → Orders.');
    } else if (checkout === 'cancel') {
      alert('Checkout canceled — nothing was charged. Your cart is still here.');
    }
    if (stripeReturn) {
      setCurrentView('account');
      payments
        .refreshStripeStatus()
        .then((complete) => {
          if (!complete)
            alert(
              'Stripe still needs a few details before you can get paid. Click "Connect" again to finish.'
            );
          loadData();
        })
        .catch((err) => console.error('Stripe status check failed', err));
    }
  }, [loadData]);

  const handlePayNow = (order: DiscAuction) => {
    const item: CartItem = {
      auctionId: order.id,
      title: order.title,
      price: order.soldPrice || order.currentBid,
      imageUrl: order.imageUrl,
      type: order.type,
      sellerId: order.sellerId,
    };
    setCart((prev) => [...prev.filter((c) => c.auctionId !== order.id), item]);
    setIsCartOpen(true);
  };

  const handleOpenAddFunds = () => {
    if (!config.isMockEnabled) {
      alert('Wallet top-ups are not connected to Stripe yet. Pay by card at checkout instead.');
      return;
    }
    setIsAddFundsOpen(true);
  };

  const handleProtectedNavigation = (view: MainView) => {
    if (!user) {
      setAuthMode('signin');
      setCurrentView('auth');
    } else {
      setCurrentView(view);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'signin') {
        await auth.signInWithEmail(authForm.email, authForm.pass);
      } else {
        const { needsConfirmation } = await auth.signUp(
          authForm.email,
          authForm.pass,
          authForm.name
        );
        if (needsConfirmation) {
          alert(
            'Vault Check: We sent you a confirmation email. Click the link in it, then sign in.'
          );
          setAuthMode('signin');
          return;
        }
      }
      setCurrentView('home');
    } catch (err: any) {
      alert(err.message);
      obs.captureException(err, { component: 'Auth', mode: authMode });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await auth.signInWithGoogle();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBid = async (id: string, amt: number) => {
    if (!user) return handleProtectedNavigation('home');
    try {
      await db.placeBid(id, user.id, amt);
      loadData();
    } catch (err: any) {
      alert(err.message);
      obs.captureException(err, { action: 'place_bid', auctionId: id, amount: amt });
    }
  };

  const handleReadNotification = async (id: string) => {
    if (!user || !user.notifications) return;
    const updatedNotifs = user.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setUser({ ...user, notifications: updatedNotifs });
    await db.markNotificationRead(user.id, id);
  };

  const handleNotificationAction = (notif: AppNotification) => {
    if (
      notif.type === AppNotificationType.Outbid ||
      notif.type === AppNotificationType.EndingSoon ||
      notif.type === AppNotificationType.AuctionWon
    ) {
      setSelectedAuctionId(notif.targetId);
      setCurrentView('home');
    } else if (notif.type === AppNotificationType.NewMessage) {
      setActiveThreadId(notif.targetId);
      handleProtectedNavigation('messenger');
    } else if (
      notif.type === AppNotificationType.ItemSold ||
      notif.type === AppNotificationType.ItemShipped ||
      notif.type === AppNotificationType.PaymentReceived ||
      notif.type === AppNotificationType.NewFollower ||
      notif.type === AppNotificationType.HighRiskAlert ||
      notif.type === AppNotificationType.ReportActionTaken
    ) {
      if (notif.type === AppNotificationType.NewFollower) {
        setViewedUserId(notif.targetId);
      } else if (notif.type === AppNotificationType.HighRiskAlert && user?.isSystemAdmin) {
        handleProtectedNavigation('admin');
      } else {
        handleProtectedNavigation('account');
      }
    }
    setIsNotificationOpen(false);
  };

  const handleMessageSeller = async (auction: DiscAuction) => {
    if (!user) return handleProtectedNavigation('home');
    const threadId = await db.createOrGetThread({
      type: 'listing',
      objectId: auction.id,
      buyerId: user.id,
      sellerId: auction.sellerId,
      objectTitle: auction.mold,
      objectImage: auction.imageUrl,
    });
    setActiveThreadId(threadId);
    setCurrentView('messenger');
    setSelectedAuctionId(null);
  };

  const handleMessageUser = async (targetUser: User) => {
    if (!user) return handleProtectedNavigation('home');
    if (user.id === targetUser.id) return;
    const threadId = await db.createOrGetThread({
      type: 'general',
      objectId: 'general_discussion',
      buyerId: user.id,
      sellerId: targetUser.id,
      objectTitle: `Chat with ${targetUser.name}`,
      objectImage: targetUser.avatar,
    });
    setActiveThreadId(threadId);
    setCurrentView('messenger');
    setViewedUserId(null);
  };

  const handleAddFundsSuccess = async (amount: number) => {
    if (!user) return;
    const updatedUser = { ...user, balance: (user.balance || 0) + amount };
    await db.updateUser(updatedUser);
    setUser(updatedUser);
  };

  const filteredAuctions = (auctions || []).filter((a) => {
    if (!a || a.status !== 'active') return false;
    const query = filters.query?.toLowerCase();
    if (query && !a.mold?.toLowerCase().includes(query) && !a.brand?.toLowerCase().includes(query))
      return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  const navLinks: { id: MainView; label: string }[] = [
    { id: 'home', label: 'Market' },
    { id: 'clubs', label: 'Clubs' },
    { id: 'wantlist', label: 'Bounty Hub' },
    { id: 'community', label: 'Community' },
    { id: 'messenger', label: 'Messages' },
    ...(user?.isSystemAdmin ? [{ id: 'admin' as MainView, label: 'Admin Hub' }] : []),
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200 flex-shrink-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                setCurrentView('home');
                setViewedUserId(null);
              }}
            >
              <div className="w-11 h-11 bg-black rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                <svg
                  className="w-8 h-8 text-orange-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 5v14M15 8h-4a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4H9"
                  />
                </svg>
              </div>
              <span className="text-2xl font-black text-black tracking-tighter hidden sm:block">
                DISC<span className="text-orange-500">FLIP</span>
              </span>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleProtectedNavigation(link.id)}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-orange-600 ${currentView === link.id ? 'text-orange-600' : 'text-slate-400'}`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-6">
              {(canInstall || showIosInstallTip) && (
                <button
                  onClick={handleInstall}
                  className="border border-slate-200 text-black px-3 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-orange-500 hover:text-orange-600 transition-all"
                >
                  Install App
                </button>
              )}
              {user ? (
                <>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 text-slate-400 hover:text-black transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    {user.notifications?.filter((n) => !n.isRead).length > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-orange-600 text-white text-[8px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                        {user.notifications.filter((n) => !n.isRead).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 text-slate-400 hover:text-black transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    {cart.length > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-black text-white text-[8px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                        {cart.length}
                      </span>
                    )}
                  </button>
                  <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
                  <button
                    onClick={() => setCurrentView('account')}
                    className="flex items-center gap-3 group"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-black uppercase tracking-tight">
                        {user.name}
                      </p>
                      <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">
                        ${user.balance.toFixed(2)}
                      </p>
                    </div>
                    <img
                      className="w-10 h-10 rounded-xl bg-slate-100 ring-2 ring-white shadow-sm group-hover:ring-orange-500 transition-all"
                      src={user.avatar}
                      alt=""
                    />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setCurrentView('auth');
                  }}
                  className="bg-black text-orange-500 px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-600 hover:text-white transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
        {isNotificationOpen && user && (
          <NotificationHub
            user={user}
            onClose={() => setIsNotificationOpen(false)}
            onRead={handleReadNotification}
            onAction={handleNotificationAction}
          />
        )}
      </header>

      <main className="flex-grow overflow-y-auto custom-scrollbar">
        {currentView === 'auth' && (
          <div className="min-h-full flex items-center justify-center bg-slate-900 p-8">
            <div className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <svg
                  className="w-10 h-10 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 5v14M15 8h-4a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4H9"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-center mb-8">
                {authMode === 'signin' ? 'Unlock Vault' : 'Join the Hunt'}
              </h2>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <input
                    required
                    type="text"
                    placeholder="Full Name"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500"
                  />
                )}
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  required
                  type="password"
                  placeholder="Passcode"
                  value={authForm.pass}
                  onChange={(e) => setAuthForm({ ...authForm, pass: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  className="w-full bg-black text-orange-500 py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-orange-600 hover:text-white transition-all mt-4"
                >
                  {authMode === 'signin' ? 'Enter Marketplace' : 'Create Hunter ID'}
                </button>
              </form>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  or
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white border-2 border-slate-200 text-black py-4 rounded-[24px] font-black uppercase tracking-widest text-[11px] hover:border-orange-500 transition-all"
              >
                Continue with Google
              </button>
              <button
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-600 transition-colors"
              >
                {authMode === 'signin' ? "Don't have an ID? Register" : 'Already a hunter? Sign In'}
              </button>
            </div>
          </div>
        )}

        {currentView === 'home' && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
              <div>
                <h1 className="text-6xl font-black text-black tracking-tighter uppercase mb-2">
                  The Market
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">
                  Hunt for rare plastic in verified vaults.
                </p>
              </div>
              <button
                onClick={() => (user ? setIsCreating(true) : handleProtectedNavigation('home'))}
                className="bg-black text-orange-50 px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-orange-600 hover:text-white transition-all"
              >
                Launch Auction
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  onClick={(id) =>
                    user ? setSelectedAuctionId(id) : handleProtectedNavigation('home')
                  }
                  onViewSeller={(sid) => setViewedUserId(sid)}
                />
              ))}
            </div>
          </div>
        )}

        {currentView === 'account' && user && (
          <AccountDashboard
            user={user}
            auctions={auctions}
            onReload={loadData}
            onAddFunds={handleOpenAddFunds}
            onPayNow={handlePayNow}
            onUpdateUser={async (u) => {
              await db.updateUser(u);
              setUser(u);
            }}
            onViewUser={setViewedUserId}
            onMessageUser={handleMessageUser}
          />
        )}
        {currentView === 'clubs' && user && (
          <ClubHub currentUser={user} auctions={auctions} onSelectAuction={setSelectedAuctionId} />
        )}
        {currentView === 'wantlist' && user && <BountyHub currentUser={user} />}
        {currentView === 'community' && user && (
          <UserSearchHub
            currentUser={user}
            onViewUser={setViewedUserId}
            onMessageUser={handleMessageUser}
          />
        )}
        {currentView === 'messenger' && user && (
          <Messenger currentUser={user} initialThreadId={activeThreadId} />
        )}
        {currentView === 'admin' && user?.isSystemAdmin && (
          <AdminHub currentUser={user} auctions={auctions} onReload={loadData} />
        )}
      </main>

      {/* Phones and tablets: the top links are hidden below the lg breakpoint, so show a tab bar */}
      <nav
        className="lg:hidden flex-shrink-0 bg-white border-t border-slate-200 flex justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => handleProtectedNavigation(link.id)}
            className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest transition-all ${currentView === link.id ? 'text-orange-600' : 'text-slate-400'}`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Modals */}
      {selectedAuctionId && user && (
        <AuctionDetail
          auction={auctions.find((a) => a.id === selectedAuctionId)!}
          onClose={() => setSelectedAuctionId(null)}
          onPlaceBid={handleBid}
          onBuyNow={(a) => {
            const item: CartItem = {
              auctionId: a.id,
              title: a.title,
              price: a.buyNowPrice || a.currentBid,
              imageUrl: a.imageUrl,
              type: a.type,
              sellerId: a.sellerId,
            };
            setCart((prev) => [...prev.filter((c) => c.auctionId !== item.auctionId), item]);
            setIsCartOpen(true);
            setSelectedAuctionId(null);
          }}
          onViewProfile={setViewedUserId}
          currentUser={user}
          onMessageSeller={handleMessageSeller}
        />
      )}
      {viewedUserId && viewedUser && user && (
        <PublicProfile
          user={viewedUser}
          auctions={auctions}
          currentUser={user}
          onClose={() => setViewedUserId(null)}
          onReload={loadData}
          onMessageUser={handleMessageUser}
        />
      )}
      {isCreating && user && (
        <CreateAuction
          onClose={() => setIsCreating(false)}
          onSubmit={async (a) => {
            await db.saveAuction({ ...a, sellerId: user!.id, seller: user!.name }, user!.id);
            setIsCreating(false);
            loadData();
          }}
          currentUser={user}
        />
      )}
      {isCartOpen && (
        <Cart
          items={cart}
          onClose={() => setIsCartOpen(false)}
          onRemove={(id) => setCart(cart.filter((c) => c.auctionId !== id))}
          onCheckout={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
          isOpen={isCartOpen}
        />
      )}
      {isCheckoutOpen && user && (
        <Checkout
          items={cart}
          user={user}
          onUserUpdated={setUser}
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={async (total, updatedItems) => {
            await db.executeCheckout(user.id, updatedItems, total);
            setCart([]);
            setIsCheckoutOpen(false);
            loadData();
            alert('Transaction complete! Plastic incoming.');
          }}
        />
      )}
      {isAddFundsOpen && user && (
        <AddFundsModal
          onClose={() => setIsAddFundsOpen(false)}
          onSuccess={handleAddFundsSuccess}
          currentBalance={user.balance}
          paymentMethods={user.paymentMethods}
        />
      )}
      {showSafetyOnboarding && (
        <SafetyOnboarding
          onComplete={async () => {
            if (user) {
              await db.markSafetyOnboardingSeen(user.id);
              setUser({ ...user, hasSeenSafetyOnboarding: true });
              setShowSafetyOnboarding(false);
            }
          }}
        />
      )}
      {showLegalOnboarding && (
        <LegalOnboarding
          onComplete={async () => {
            if (user) {
              await db.acceptLegalTerms(user.id);
              setUser({ ...user, hasAcceptedLegalTerms: true });
              setShowLegalOnboarding(false);
              if (!user.hasSeenSafetyOnboarding) setShowSafetyOnboarding(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
