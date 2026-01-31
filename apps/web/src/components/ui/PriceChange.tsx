import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

// Helper to safely convert any value to a number
function toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

interface PriceChangeProps {
  value?: number | string | null;
  percentage?: number | string | null;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({ 
  value, 
  percentage, 
  showIcon = true,
  size = 'md'
}: PriceChangeProps) {
  const safeValue = toNumber(value);
  const safePercentage = percentage != null ? toNumber(percentage) : null;
  
  const isPositive = safeValue > 0;
  const isNegative = safeValue < 0;
  const isNeutral = safeValue === 0;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium',
        sizeClasses[size],
        isPositive && 'text-success-400',
        isNegative && 'text-danger-400',
        isNeutral && 'text-surface-400'
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>
        {isPositive && '+'}
        {safePercentage != null ? `${safePercentage.toFixed(2)}%` : `$${Math.abs(safeValue).toFixed(2)}`}
      </span>
    </span>
  );
}

export function formatCurrency(value?: number | string | null, currency = 'USD'): string {
  const safeValue = toNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatNumber(value?: number | string | null, decimals = 2): string {
  const safeValue = toNumber(value);
  if (Math.abs(safeValue) >= 1e9) {
    return `${(safeValue / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(safeValue) >= 1e6) {
    return `${(safeValue / 1e6).toFixed(1)}M`;
  }
  if (Math.abs(safeValue) >= 1e3) {
    return `${(safeValue / 1e3).toFixed(1)}K`;
  }
  return safeValue.toFixed(decimals);
}
