import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-xl',
        hover && 'hover:bg-surface-800/50 hover:border-surface-700 transition-all duration-200 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={clsx('p-5 border-b border-surface-800', className)}>
      {children}
    </div>
  );
}

export function CardContent({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={clsx('p-5', className)}>
      {children}
    </div>
  );
}
