import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Package, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { useLoadsStats } from '@/hooks/useLoadsStats';
import { formatCurrency } from '@/lib/dateFormatting';
import { PeriodFilterValue } from './PeriodFilter';

interface LoadsStatsCardsProps {
  periodFilter?: PeriodFilterValue;
}

export function LoadsStatsCards({ periodFilter }: LoadsStatsCardsProps) {
  const { data: stats, isLoading } = useLoadsStats({ periodFilter });
  const { t } = useTranslation(['loads', 'common']);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Total Cargas Activas */}
      <StatsCard
        title={t('loads:stats.total_active')}
        value={stats?.totalActive || 0}
        icon={<Package className="h-4 w-4 text-muted-foreground" />}
        variant="default"
      />

      {/* Total en Tránsito */}
      <StatsCard
        title={t('loads:stats.in_transit')}
        value={stats?.totalInTransit || 0}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        variant="success"
      />

      {/* Pendientes de Asignación */}
      <StatsCard
        title={t('loads:stats.pending_assignment')}
        value={stats?.pendingAssignment || 0}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        variant="warning"
      />

      {/* Monto Total */}
      <StatsCard
        title={t('loads:stats.total_amount')}
        value={formatCurrency(stats?.totalAmount || 0)}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        variant="default"
      />
    </div>
  );
}
