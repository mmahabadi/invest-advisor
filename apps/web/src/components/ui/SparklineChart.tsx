import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { marketApi } from '../../services/api';

interface SparklineChartProps {
  symbol: string;
  range?: '1d' | '1w' | '1m';
  className?: string;
  height?: number;
}

export function SparklineChart({ 
  symbol, 
  range = '1w',
  className = '',
  height = 40 
}: SparklineChartProps) {
  const { data: response, isLoading, error } = useQuery<{ data: Array<{ close: number; timestamp: string }> }>({
    queryKey: ['sparkline', symbol, range],
    queryFn: () => marketApi.getHistory(symbol, range),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Extract the data array from the response
  const data = response?.data || [];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="w-full h-full bg-surface-800/50 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !data.length) {
    return (
      <div className={`flex items-center justify-center text-surface-600 text-xs ${className}`} style={{ height }}>
        —
      </div>
    );
  }

  // Calculate trend color
  const prices = data.map((d) => d.close).filter(Boolean);
  const firstPrice = prices[0] || 0;
  const lastPrice = prices[prices.length - 1] || 0;
  const isPositive = lastPrice >= firstPrice;

  // Prepare chart data
  const chartData = data.map((d) => ({
    value: d.close,
  }));

  const strokeColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#gradient-${symbol})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
