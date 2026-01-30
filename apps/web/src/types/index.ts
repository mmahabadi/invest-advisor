// User types
export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
}

// Auth types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Portfolio types
export interface PortfolioItem {
  id: string;
  symbol: string;
  assetType: 'stock' | 'etf' | 'crypto' | 'commodity';
  assetName: string;
  quantity: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPct: number;
  lastPriceUpdate: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPct: number;
  todayChange: number;
  todayChangePct: number;
}

export interface Portfolio {
  summary: PortfolioSummary;
  items: PortfolioItem[];
}

// Watchlist types
export interface TargetPrice {
  buyTarget: number;
  sellTarget: number;
  stopLoss: number | null;
  confidence: number;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'avoid';
  timeHorizon: 'short' | 'medium' | 'long';
  riskLevel: 'low' | 'medium' | 'high';
  analysisSummary: string;
  keyFactors: string[];
  technicalIndicators: {
    rsi?: number;
    macdSignal?: string;
    trend?: string;
    support?: number;
    resistance?: number;
  };
  sentiment?: {
    overall: string;
    score: number;
  };
  generatedAt: string;
  validUntil: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  assetType: 'stock' | 'etf' | 'crypto' | 'commodity';
  assetName: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePct24h: number;
  addedAt: string;
  targetPrice: TargetPrice | null;
  distanceToBuyPct: number | null;
}

// Alert types
export interface Alert {
  id: string;
  symbol: string;
  assetType: string;
  alertType: 'price_above' | 'price_below' | 'buy_target' | 'sell_target' | 'stop_loss';
  targetPrice: number | null;
  currentPrice: number | null;
  isActive: boolean;
  isRecurring: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export interface AlertHistory {
  id: string;
  symbol: string;
  alertType: string;
  triggeredAt: string;
  priceAtTrigger: number;
  targetPrice: number | null;
  emailSent: boolean;
  acknowledged: boolean;
  actionTaken: string | null;
}

// Market types
export interface MarketOverview {
  indices: {
    sp500: { value: number; change: number; changePct: number } | null;
    nasdaq: { value: number; change: number; changePct: number } | null;
    dow: { value: number; change: number; changePct: number } | null;
  };
  crypto: {
    btc: { price: number; change24h: number } | null;
    eth: { price: number; change24h: number } | null;
  };
  commodities: {
    gold: { price: number; change: number } | null;
    silver: { price: number; change: number } | null;
  };
  marketStatus: string;
  lastUpdated: string;
}

// Settings types
export interface Settings {
  currency: string;
  timezone: string;
  theme: string;
  notifications: {
    email: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    minConfidenceAlert: number;
  };
}
