import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Eye, 
  Bell,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge, RecommendationBadge, ConfidenceBadge } from '../components/ui/Badge';
import { PriceChange, formatCurrency } from '../components/ui/PriceChange';
import { portfolioApi, watchlistApi, marketApi } from '../services/api';
import type { Portfolio, WatchlistItem, MarketOverview } from '../types';

export default function Dashboard() {
  const { data: portfolio, isLoading: portfolioLoading } = useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: () => portfolioApi.getPortfolio(),
  });
  
  const { data: watchlist, isLoading: watchlistLoading } = useQuery<{ items: WatchlistItem[] }>({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.getWatchlist('confidence', 'desc'),
  });
  
  const { data: market, isLoading: marketLoading } = useQuery<MarketOverview>({
    queryKey: ['marketOverview'],
    queryFn: () => marketApi.getOverview(),
  });

  const isLoading = portfolioLoading || watchlistLoading || marketLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  const summary = portfolio?.summary;
  const topWatchlist = watchlist?.items?.slice(0, 5) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Portfolio Value"
          value={formatCurrency(summary?.currentValue || 0)}
          change={summary?.todayChangePct || 0}
          icon={Wallet}
          iconColor="bg-primary-500"
        />
        <SummaryCard
          title="Total Profit/Loss"
          value={formatCurrency(summary?.profitLoss || 0)}
          change={summary?.profitLossPct || 0}
          icon={(summary?.profitLoss ?? 0) >= 0 ? TrendingUp : TrendingDown}
          iconColor={(summary?.profitLoss ?? 0) >= 0 ? 'bg-success-500' : 'bg-danger-500'}
        />
        <SummaryCard
          title="Watchlist Items"
          value={String(watchlist?.items?.length || 0)}
          subtitle="assets tracked"
          icon={Eye}
          iconColor="bg-warning-500"
        />
        <SummaryCard
          title="Active Alerts"
          value="3"
          subtitle="notifications"
          icon={Bell}
          iconColor="bg-primary-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100">Market Overview</h2>
              <Badge variant={market?.marketStatus === 'open' ? 'success' : 'default'}>
                {market?.marketStatus || 'Closed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MarketTile
                name="S&P 500"
                value={market?.indices?.sp500?.value}
                change={market?.indices?.sp500?.changePct}
              />
              <MarketTile
                name="NASDAQ"
                value={market?.indices?.nasdaq?.value}
                change={market?.indices?.nasdaq?.changePct}
              />
              <MarketTile
                name="DOW"
                value={market?.indices?.dow?.value}
                change={market?.indices?.dow?.changePct}
              />
              <MarketTile
                name="Bitcoin"
                value={market?.crypto?.btc?.price}
                change={market?.crypto?.btc?.change24h}
                prefix="$"
              />
              <MarketTile
                name="Ethereum"
                value={market?.crypto?.eth?.price}
                change={market?.crypto?.eth?.change24h}
                prefix="$"
              />
              <MarketTile
                name="Gold"
                value={market?.commodities?.gold?.price}
                change={market?.commodities?.gold?.change}
                prefix="$"
              />
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Allocation */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-surface-100">Portfolio</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolio?.items?.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-surface-300">
                      {item.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-100">{item.symbol}</p>
                    <p className="text-xs text-surface-500">{formatCurrency(item.currentValue)}</p>
                  </div>
                </div>
                <PriceChange value={item.profitLoss} percentage={item.profitLossPct} size="sm" />
              </div>
            ))}
            <Link 
              to="/portfolio" 
              className="block text-center text-sm text-primary-400 hover:text-primary-300 pt-2"
            >
              View all holdings →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Watchlist Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-100">Top Opportunities</h2>
            <Link to="/watchlist" className="text-sm text-primary-400 hover:text-primary-300">
              View watchlist →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-surface-500 border-b border-surface-800">
                  <th className="pb-3 font-medium">Symbol</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Buy Target</th>
                  <th className="pb-3 font-medium">Distance</th>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {topWatchlist.map((item) => (
                  <tr key={item.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="py-4">
                      <div>
                        <p className="font-medium text-surface-100">{item.symbol}</p>
                        <p className="text-xs text-surface-500">{item.assetName}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="font-mono text-surface-200">
                        {formatCurrency(item.currentPrice)}
                      </p>
                      <PriceChange value={item.priceChange24h} percentage={item.priceChangePct24h} size="sm" />
                    </td>
                    <td className="py-4 font-mono text-surface-300">
                      {item.targetPrice?.buyTarget 
                        ? formatCurrency(item.targetPrice.buyTarget)
                        : '—'}
                    </td>
                    <td className="py-4">
                      {item.distanceToBuyPct != null && (
                        <span className={item.distanceToBuyPct <= 5 ? 'text-success-400' : 'text-surface-400'}>
                          {item.distanceToBuyPct > 0 ? '+' : ''}{Number(item.distanceToBuyPct).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      {item.targetPrice && (
                        <ConfidenceBadge confidence={item.targetPrice.confidence} />
                      )}
                    </td>
                    <td className="py-4">
                      {item.targetPrice && (
                        <RecommendationBadge recommendation={item.targetPrice.recommendation} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ 
  title, 
  value, 
  change, 
  subtitle,
  icon: Icon, 
  iconColor 
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-surface-500">{title}</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">{value}</p>
            {change !== undefined && (
              <PriceChange value={change} percentage={change} size="sm" />
            )}
            {subtitle && (
              <p className="text-xs text-surface-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketTile({ 
  name, 
  value, 
  change,
  prefix = '' 
}: { 
  name: string; 
  value?: number | null; 
  change?: number | null;
  prefix?: string;
}) {
  if (value == null) return null;
  
  const changeValue = change ?? 0;
  const isPositive = changeValue >= 0;
  
  return (
    <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-surface-400">{name}</span>
        {isPositive ? (
          <ArrowUpRight className="w-4 h-4 text-success-400" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-danger-400" />
        )}
      </div>
      <p className="text-lg font-semibold text-surface-100">
        {prefix}{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      {change != null && (
        <p className={`text-sm ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
          {isPositive ? '+' : ''}{changeValue.toFixed(2)}%
        </p>
      )}
    </div>
  );
}
