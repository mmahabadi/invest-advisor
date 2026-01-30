import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-surface-700/50 text-surface-300',
  success: 'bg-success-500/20 text-success-400',
  danger: 'bg-danger-500/20 text-danger-400',
  warning: 'bg-warning-500/20 text-warning-400',
  primary: 'bg-primary-500/20 text-primary-400',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size]
      )}
    >
      {children}
    </span>
  );
}

export function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    strong_buy: { variant: 'success', label: 'Strong Buy' },
    buy: { variant: 'success', label: 'Buy' },
    hold: { variant: 'warning', label: 'Hold' },
    sell: { variant: 'danger', label: 'Sell' },
    avoid: { variant: 'danger', label: 'Avoid' },
  };
  
  const { variant, label } = config[recommendation] || { variant: 'default', label: recommendation };
  
  return <Badge variant={variant}>{label}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  let variant: BadgeProps['variant'] = 'default';
  
  if (confidence >= 80) variant = 'success';
  else if (confidence >= 60) variant = 'primary';
  else if (confidence >= 40) variant = 'warning';
  else variant = 'danger';
  
  return <Badge variant={variant}>{confidence}%</Badge>;
}
