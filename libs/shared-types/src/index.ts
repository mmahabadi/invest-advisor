// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
  timezone: string;
  currency: string;
  theme: 'dark' | 'light' | 'system';
  createdAt: string;
  updatedAt: string;
}

// Asset Types
export type AssetType = 'stock' | 'etf' | 'crypto' | 'commodity';

// Portfolio Types
export interface PortfolioItem {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  assetName: string;
  quantity: number;
  avgCost: number;
  totalCost: number;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPct?: number;
  lastPriceUpdate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  portfolioItemId: string;
  userId: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  transactionDate: string;
  notes?: string;
  createdAt: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPct: number;
  todayChange: number;
  todayChangePct: number;
}

// Watchlist Types
export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  assetName: string;
  currentPrice?: number;
  priceChange24h?: number;
  priceChangePct24h?: number;
  volume24h?: number;
  lastPriceUpdate?: string;
  priority: number;
  notes?: string;
  addedAt: string;
  updatedAt: string;
}

export type Recommendation = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'avoid';
export type TimeHorizon = 'short' | 'medium' | 'long';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Trend = 'uptrend' | 'downtrend' | 'sideways';
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface TargetPrice {
  id: string;
  watchlistItemId: string;
  buyTarget: number;
  sellTarget: number;
  stopLoss?: number;
  confidence: number;
  recommendation: Recommendation;
  timeHorizon?: TimeHorizon;
  riskLevel?: RiskLevel;
  rsi?: number;
  macdSignal?: string;
  trend?: Trend;
  supportLevel?: number;
  resistanceLevel?: number;
  newsSentiment?: Sentiment;
  sentimentScore?: number;
  analysisSummary?: string;
  keyFactors?: string[];
  generatedAt: string;
  validUntil?: string;
}

// Alert Types
export type AlertType = 'price_above' | 'price_below' | 'buy_target' | 'sell_target' | 'stop_loss' | 'percentage_change';

export interface Alert {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  alertType: AlertType;
  targetPrice?: number;
  percentageChange?: number;
  isActive: boolean;
  isRecurring: boolean;
  watchlistItemId?: string;
  portfolioItemId?: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
}

export interface AlertHistory {
  id: string;
  alertId?: string;
  userId: string;
  symbol: string;
  alertType: AlertType;
  triggeredAt: string;
  priceAtTrigger: number;
  targetPrice?: number;
  emailSent: boolean;
  emailSentAt?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  actionTaken?: 'bought' | 'sold' | 'ignored';
}

// Market Data Types
export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  lastUpdated: string;
}

export interface MarketOverview {
  indices: {
    sp500?: { value: number; change: number; changePct: number };
    nasdaq?: { value: number; change: number; changePct: number };
    dow?: { value: number; change: number; changePct: number };
  };
  crypto: {
    btc?: { price: number; change24h: number };
    eth?: { price: number; change24h: number };
  };
  commodities: {
    gold?: { price: number; change: number };
    silver?: { price: number; change: number };
  };
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  lastUpdated: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
