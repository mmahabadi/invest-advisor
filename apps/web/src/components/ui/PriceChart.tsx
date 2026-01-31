import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { marketApi } from '../../services/api';
import { formatEUR } from '../../utils/currency';

interface PriceChartProps {
  symbol: string;
  name?: string;
  onClose?: () => void;
  buyPrice?: number; // Optional buy price to show as reference line
}

const TIME_RANGES = [
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1Y' },
] as const;

type TimeRange = typeof TIME_RANGES[number]['key'];

interface HistoryResponse {
  symbol: string;
  range: string;
  data: Array<{ timestamp: string; close: number; volume: number }>;
}

export function PriceChart({ symbol, name, onClose, buyPrice }: PriceChartProps) {
  const [range, setRange] = useState<TimeRange>('1m');

  const { data: response, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['priceChart', symbol, range],
    queryFn: () => marketApi.getHistory(symbol, range),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Extract the data array from the response
  const historyData = response?.data || [];

  // Calculate stats
  const prices = historyData.map((d) => d.close).filter(Boolean);
  const currentPrice = prices[prices.length - 1] || 0;
  const startPrice = prices[0] || 0;
  const change = currentPrice - startPrice;
  const changePct = startPrice ? ((change / startPrice) * 100) : 0;
  const isPositive = change >= 0;

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Format data for chart
  const chartData = historyData.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
    }),
    time: new Date(d.timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: d.close,
    volume: d.volume,
  }));

  const strokeColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-surface-100">{symbol}</h2>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-success-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-danger-400" />
              )}
            </div>
            {name && <p className="text-sm text-surface-500">{name}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price Stats */}
        <div className="px-4 py-3 flex items-center gap-6 border-b border-surface-800">
          <div>
            <p className="text-2xl font-bold text-surface-100 font-mono">
              {formatEUR(currentPrice)}
            </p>
            <p className={`text-sm ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
              {isPositive ? '+' : ''}{formatEUR(change)} ({changePct.toFixed(2)}%)
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-surface-500">High</p>
              <p className="text-surface-200 font-mono">{formatEUR(maxPrice)}</p>
            </div>
            <div>
              <p className="text-surface-500">Low</p>
              <p className="text-surface-200 font-mono">{formatEUR(minPrice)}</p>
            </div>
            {buyPrice && (
              <div>
                <p className="text-surface-500">Your Avg Cost</p>
                <p className="text-primary-400 font-mono">{formatEUR(buyPrice)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="px-4 py-2 flex gap-1 border-b border-surface-800">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === r.key
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="p-4 h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : error || !historyData.length ? (
            <div className="flex items-center justify-center h-full text-surface-500">
              No chart data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey={range === '1d' ? 'time' : 'date'}
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#9ca3af' }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `€${value.toFixed(0)}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: number) => [formatEUR(value), 'Price']}
                />
                {/* Buy price reference line */}
                {buyPrice && (
                  <Area
                    type="monotone"
                    dataKey={() => buyPrice}
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fill="none"
                    name="Your Cost"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#chartGradient)"
                  name="Price"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
