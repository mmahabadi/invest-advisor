import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface PriceChangeProps {
  value: number;
  percentage?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({ 
  value, 
  percentage, 
  showIcon = true,
  size = 'md'
}: PriceChangeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;
  
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
        {percentage !== undefined ? `${percentage.toFixed(2)}%` : `$${Math.abs(value).toFixed(2)}`}
      </span>
    </span>
  );
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toFixed(decimals);
}
