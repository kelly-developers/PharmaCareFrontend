import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className, iconClassName }: StatCardProps) {
  return (
    <Card variant="stat" className={cn('animate-slide-up', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg lg:text-xl font-bold font-display tracking-tight">{value}</p>
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
            {trend && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{trend.value}%</span>
                <span className="text-muted-foreground font-normal">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl',
            iconClassName || 'bg-primary/10 text-primary'
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
