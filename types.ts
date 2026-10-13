export interface ImageSet {
  full: string; // Original / High Res
  medium: string; // Feed Optimized (600px)
  thumb: string; // List Optimized (200px)
}

export enum DiscCondition {
  New = 10,
  NearlyNew = 9,
  FieldTested = 8,
  Used = 7,
  Beaten = 6,
  Poor = 5,
}

export enum AuctionType {
  Standard = 'Standard Auction',
  BuyItNow = 'Buy It Now',
  Hybrid = 'Hybrid (Bid + BIN)',
  MysteryBox = 'Mystery Box',
  BagBuilder = 'Bag Builder',
}

export enum ShippingOption {
  ShippingOnly = 'Shipping Only',
  PickupOnly = 'Local Pickup Only',
  Both = 'Shipping & Local Pickup',
}

export enum DomeType {
  Flat = 'Flat',
  Mild = 'Mild Dome',
  Medium = 'Medium Dome',
  PopTop = 'Pop Top',
  Any = 'Any Profile',
}

export enum VerificationTier {
  Basic = 'Basic',
  VerifiedRun = 'Verified Run',
  FullyVerified = 'Fully Verified',
}

export enum StampType {
  Stock = 'Stock',
  TourSeries = 'Tour Series',
  LimitedEdition = 'Limited Edition',
  Custom = 'Custom / Dye',
  Misprint = 'Misprint / F2',
}

export enum PlasticFeel {
  Stiff = 'Stiff',
  Medium = 'Medium',
  Soft = 'Soft',
  Gummy = 'Gummy',
  Tacky = 'Tacky',
}

export enum FlightOffset {
  Understable = 'More Understable',
  TrueToNumbers = 'True to Numbers',
  Overstable = 'More Overstable',
}

export enum AppNotificationType {
  Outbid = 'outbid',
  EndingSoon = 'ending_soon',
  ItemSold = 'item_sold',
  ItemShipped = 'item_shipped',
  PaymentReceived = 'payment_received',
  NewFollower = 'new_follower',
  HighRiskAlert = 'high_risk_alert',
  ReportActionTaken = 'report_action_taken',
  NewMessage = 'new_message',
  OfferAccepted = 'offer_accepted',
  CarrierScanned = 'carrier_scanned',
  OutForDelivery = 'out_for_delivery',
  Delivered = 'delivered',
  ShipDeadlineReminder = 'ship_deadline_reminder',
  OrderIssueReported = 'order_issue_reported',
  PayoutSuccess = 'payout_success',
  AuctionWon = 'auction_won',
  SystemAlert = 'system_alert',
}

export enum GlowLevel {
  None = 'None',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum SwirlLevel {
  None = 'None',
  Light = 'Light Swirl',
  Medium = 'Medium Swirl',
  Heavy = 'Heavy Swirl',
}

export enum DiscVisibility {
  Public = 'Public',
  Friends = 'Friends Only',
  Private = 'Private',
}

export enum DiscLocation {
  Vault = 'Vault',
  Bag = 'Bag',
}

export enum RestrictionLevel {
  None = 'None',
  Warning = 'Warning',
  AccountFreeze = 'Account Freeze',
  RestrictedMessaging = 'Restricted Messaging',
  Banned = 'Banned',
}

export enum ReportTargetType {
  User = 'User Profile',
  Listing = 'Auction / Listing',
  Message = 'Direct Message',
  Order = 'Order',
  Club = 'Club',
  Bounty = 'Bounty',
}

export enum ReportStatus {
  Received = 'Received',
  UnderReview = 'Under Review',
  ActionTaken = 'Action Taken',
  Resolved = 'Resolved',
  Dismissed = 'Dismissed',
}

export enum ReportCategory {
  OffPlatform = 'Off-Platform Payment Attempt',
  Scam = 'Potential Scam / Fraud',
  Harassment = 'Harassment or Abuse',
  Misrepresentation = 'Item Mismatch / Condition Fraud',
  Counterfeit = 'Counterfeit Plastic',
  Spam = 'Spamming',
  Other = 'Other Violation',
}

export enum ReportSeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum ThreadType {
  Listing = 'listing',
  General = 'general',
  Order = 'order',
  Bounty = 'bounty',
  Club = 'club',
}

export enum BountyType {
  WTB = 'WTB (Want to Buy)',
  Trade = 'WTT (Want to Trade)',
  ISO = 'ISO (In Search Of)',
}

export enum BountyStatus {
  Open = 'Open',
  Fulfilled = 'Fulfilled',
  Expired = 'Expired',
  Cancelled = 'Cancelled',
}

export enum BountyVisibility {
  Public = 'Public',
  ClubOnly = 'Club Members Only',
}

export enum OrderStatus {
  Active = 'active',
  Expired = 'expired',
  Sold = 'sold',
  Packed = 'packed',
  LabelCreated = 'label_created',
  CarrierScanned = 'carrier_scanned',
  InTransit = 'in_transit',
  Delivered = 'delivered',
  Completed = 'completed',
  Refunded = 'refunded',
  AdminClosed = 'admin_closed',
  AwaitingScheduling = 'awaiting_scheduling',
  PickupScheduled = 'pickup_scheduled',
  Disputed = 'disputed',
}

export interface Bid {
  id: string;
  bidder: string;
  bidderId: string;
  amount: number;
  maxAmount?: number;
  timestamp: number;
}

export interface TrackingEvent {
  id: string;
  timestamp: number;
  location: string;
  message: string;
  type: 'scan' | 'transit' | 'delivery' | 'exception';
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  reason: string;
  timestamp: number;
}

export interface ShippingAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface PickupDetails {
  location: string;
  timeWindow: string;
  shareLocation: boolean;
  verificationPin?: string;
}

export interface DiscAuction {
  id: string;
  sellerId: string;
  seller: string;
  title: string;
  brand: string;
  mold: string;
  plastic: string;
  weight: number;
  color: string;
  condition: number;
  hasInk: boolean;
  description: string;
  imageUrl: string;
  imageSet?: ImageSet;
  rimImage?: string;
  profileImage?: string;
  weightPhoto?: string;
  additionalImages?: string[];
  isHidden?: boolean;
  isUnderReview?: boolean;
  type: AuctionType;
  currentBid: number;
  endTime: number;
  status: string;
  bids: Bid[];
  category: string;
  shippingCost: number;
  shippingOption: ShippingOption;
  startPrice: number;
  bidCount: number;
  bidIncrement: number;
  antiSnipe: boolean;
  duration: number;
  shippingPrice: number;
  shippingMethod: string;
  handlingTime: number;
  location: DiscLocation;
  flightNumbers: { speed: number; glide: number; turn: number; fade: number };
  dome: DomeType;
  createdAt: number;
  buyerId?: string;
  soldPrice?: number;
  soldAt?: number;
  clubId?: string;
  confirmationDeadline?: number;
  trackingNumber?: string;
  labelCarrier?: string;
  adminLogs?: AdminLog[];
  /** 'unpaid' = auction won but the winner hasn't checked out yet; 'pending' = paid, held in escrow */
  payoutStatus?: 'unpaid' | 'pending' | 'released' | 'authorized' | 'held' | 'refunded';
  shippingLabelUrl?: string;
  orderDispute?: OrderDispute;
  signatureRequired?: boolean;
  fulfillmentMode?: 'shipping' | 'pickup';
  buyerShippingAddress?: ShippingAddress;
  buyNowPrice?: number;
  startTime?: number;
  autoRelist?: boolean;
  trackingIncluded?: boolean;
  physicalLocation?: string;
  visibility?: DiscVisibility;
  flightOffset?: FlightOffset;
  flex?: number;
  glow?: GlowLevel;
  swirl?: SwirlLevel;
  feelTags?: string[];
  run?: string;
  foilColor?: string;
  stampType?: string;
  isRarity?: boolean;
  rarityTags?: string[];
  isAutographed?: boolean;
  hasCOA?: boolean;
  wearHistory?: string;
  storageNotes?: string;
  smokeFree?: boolean;
  petFree?: boolean;
  returnPolicy?: string;
  tradeAccepted?: boolean;
  isLot?: boolean;
  isForTrade?: boolean;
  isInBag?: boolean;
  watcherCount?: number;
  viewCount?: number;
  qrCodeId?: string;
  inkLocation?: string;
  inkHeavy?: string;
  scuffs?: string;
  gouges?: string;
  warping?: string;
  highBidderId?: string;
  highBidderMaxAmount?: number;
  antiSnipeWindowMs?: number;
  bundleId?: string;
  trackingEvents?: TrackingEvent[];
  payoutReleased?: boolean;
  packagingProofPhoto?: string;
  shipByDate?: number;
  isHighValueHold?: boolean;
  pickupDetails?: PickupDetails;
  additionalImageSets?: ImageSet[];
  plasticFeel?: PlasticFeel;
  verificationTier?: VerificationTier;
}

export interface CartItem {
  auctionId: string;
  title: string;
  price: number;
  imageUrl: string;
  type: AuctionType;
  sellerId: string;
  fulfillment?: 'shipping' | 'pickup';
  insuranceOpted?: boolean;
  signatureRequired?: boolean;
}

export interface ShopPromotion {
  id: string;
  type: 'shipping_discount' | 'bundle_discount';
  threshold: number;
  value: number;
  isActive: boolean;
}

export enum ShippingServiceType {
  Standard = 'Standard',
  Priority = 'Priority',
  Overnight = 'Overnight',
}

export enum CombinedShippingType {
  PerAdditional = 'Per Additional',
  FreeThreshold = 'Free Threshold',
  Tiers = 'Tiers',
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  last4: string;
  expiry: string;
  brand: string;
  isDefault: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  last4: string;
  routingNumber: string;
  isVerified: boolean;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  pdgaNumber?: string;
  email: string;
  avatar: string;
  rating: number;
  balance: number;
  payoutBalance: number;
  pendingBalance: number;
  totalSales: number;
  bio: string;
  location: string;
  joinedDate: number;
  isIdentityVerified: boolean;
  isProSeller: boolean;
  paymentMethods: PaymentMethod[];
  bankAccounts: BankAccount[];
  shippingAddresses: ShippingAddress[];
  inventory: DiscAuction[];
  notifications: AppNotification[];
  followingIds: string[];
  favoriteUserIds: string[];
  blockedUserIds: string[];
  mutedUserIds: string[];
  followerCount: number;
  specialtyBadges: string[];
  inventoryTags: string[];
  lastActive: number;
  strikes: number;
  restrictionLevel: RestrictionLevel;
  restrictionExpires?: number;
  spamScore: number;
  isSystemAdmin?: boolean;
  hasSeenSafetyOnboarding?: boolean;
  hasAcceptedLegalTerms?: boolean;
  legalAcceptedAt?: number;
  trades?: any[];
  wantList?: any[];
  savedSearches?: any[];
  promotions?: ShopPromotion[];
  clubId?: string;
  ownedClubId?: string;
  bountyReliabilityScore?: number;
  avgShipTime?: string;
  stripeOnboardingComplete?: boolean;
  requiresIdForPayout?: boolean;
  requiresTrackedShipping?: boolean;
  combinedShippingConfig?: {
    type: CombinedShippingType;
    basePrice: number;
    additionalPrice?: number;
    freeThreshold?: number;
    tiers?: { maxDiscs: number; price: number }[];
  };
}

export interface AppNotification {
  id: string;
  timestamp: number;
  isRead: boolean;
  type: AppNotificationType;
  title: string;
  message: string;
  targetId: string;
}

export interface UserReport {
  id: string;
  ticketId: string;
  reporterId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  category: ReportCategory;
  details: string;
  evidencePhotos: string[];
  contextSnapshot: any;
  status: ReportStatus;
  severity: ReportSeverity;
  timestamp: number;
  clubId?: string;
  internalNotes: InternalNote[];
}

export interface InternalNote {
  id: string;
  adminId: string;
  adminName: string;
  text: string;
  timestamp: number;
}

export interface InfraHealth {
  webhooks: 'Operational' | 'Degraded' | 'Critical';
  queueBacklog: number;
  errorRate: number;
  apiLatency: string;
  dbConnections: number;
  lastPaymentSync: number;
}

export interface SearchFilters {
  query: string;
  brand: string[];
  category: string[];
  plasticFeel: any[];
  stampType: any[];
  weightRange: [number, number];
  conditionMin: number;
  hasInk: boolean | null;
  verificationTier: any | null;
}

export interface Thread {
  id: string;
  type: string;
  objectId: string;
  participantIds: string[];
  objectTitle: string;
  objectImage: string;
  lastTimestamp: number;
  status: 'open' | 'closed';
  buyerId: string;
  sellerId: string;
  unreadCount: Record<string, number>;
  lastMessage?: string;
  isSpamRequest?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isRead: boolean;
  offer?: any;
}

export interface DiscClub {
  id: string;
  name: string;
  location: string;
  logo: string;
  adminId: string;
  memberIds: string[];
  pendingMemberIds: string[];
  bannedMemberIds: string[];
  memberCount: number;
  rating: number;
  description: string;
  isVerified: boolean;
  fundraiserGoal?: number;
  fundraiserRaised?: number;
}

export interface SellerPerformance {
  avgShipTimeMs: number;
  trackingComplianceRate: number;
  lateShipmentRate: number;
  totalShipments: number;
  badges: string[];
}

export enum TradeStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Declined = 'Declined',
  Completed = 'Completed',
}

export interface TradeOffer {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  senderDiscs: string[];
  receiverDiscs: string[];
  cashAdjustment: number;
  status: TradeStatus;
  timestamp: number;
}

export interface DropEvent {
  id: string;
  brand: string;
  mold: string;
  plastic: string;
  releaseDate: number;
  imageUrl: string;
  description: string;
  isCharity: boolean;
  hypeCount: number;
}

export interface BountySubmission {
  id: string;
  bountyId: string;
  sellerId: string;
  sellerName: string;
  priceProposed: number;
  notes: string;
  imageUrl: string;
  condition: number;
  hasInk: boolean;
  timestamp: number;
}

export interface Bounty {
  id: string;
  buyerId: string;
  buyerName: string;
  type: BountyType;
  brand: string;
  mold: string;
  plastic: string;
  weightMin: number;
  weightMax: number;
  colorPreference?: string;
  colorMustBe?: boolean;
  conditionMin: number;
  inkAllowed: boolean;
  domePreference: DomeType;
  glowRequired: boolean;
  mustBeUnthrown: boolean;
  priceOffer: number;
  priceIsShipped: boolean;
  isVerifiedBounty: boolean;
  visibility: BountyVisibility;
  status: BountyStatus;
  createdAt: number;
  expirationDate: number;
  viewCount: number;
  autoRenew: boolean;
  submissions: BountySubmission[];
}

export interface MessageOffer {
  amount: number;
  shippingIncluded: boolean;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

export interface PackagePreset {
  id: string;
  name: string;
  type: 'mailer' | 'box';
  length: number;
  width: number;
  height: number;
  maxDiscs: number;
  tareWeightOz: number;
}

export interface OrderDispute {
  reason:
    | 'condition_mismatch'
    | 'never_shipped'
    | 'tracking_stuck'
    | 'delivered_missing'
    | 'shipping_damage'
    | 'wrong_item';
  details: string;
  partialRefundRequested?: number;
  proposedResolution: 'partial_refund' | 'return_refund' | 'full_refund';
  evidencePhotos: string[];
  status: 'open' | 'resolved' | 'dismissed';
  timestamp: number;
}
