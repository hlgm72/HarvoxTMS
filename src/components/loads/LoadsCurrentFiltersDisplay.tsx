import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FilterX, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { usePaymentPeriodById } from '@/hooks/usePaymentPeriodById';
import { useCalculatedPeriods } from '@/hooks/useCalculatedPeriods';
import { PeriodFilterValue } from './PeriodFilter';

interface LoadsCurrentFiltersDisplayProps {
  filters: {
    search: string;
    status: string;
    driverId: string;
    brokerId: string;
  };
  periodFilter: PeriodFilterValue;
  drivers: any[];
  brokers: any[];
  onClearFilters: () => void;
}

export function LoadsCurrentFiltersDisplay({
  filters,
  periodFilter,
  drivers,
  brokers,
  onClearFilters
}: LoadsCurrentFiltersDisplayProps) {
  const { t } = useTranslation(['loads', 'common']);
  
  // Obtener información del período por ID (real de BD)
  const { data: periodData } = usePaymentPeriodById(periodFilter?.periodId);
  
  // Obtener períodos calculados para casos donde no hay período real
  const { data: calculatedPeriods } = useCalculatedPeriods();
  
  const getFilterBadges = () => {
    const badges = [];
    
    // Período actual - mostrar período real o calculado
    if (periodFilter?.periodId && periodData) {
      // Período real de BD - obtener fechas del período padre
      const startDate = periodData.period?.period_start_date 
        ? format(new Date(periodData.period.period_start_date + 'T00:00:00'), 'dd MMM')
        : '';
      const endDate = periodData.period?.period_end_date
        ? format(new Date(periodData.period.period_end_date + 'T00:00:00'), 'dd MMM yyyy')
        : '';
      badges.push({ 
        key: 'period', 
        label: `${t('filters.period')}: ${startDate} - ${endDate}` 
      });
    } else if (periodFilter?.type === 'current' && calculatedPeriods?.current) {
      // Período calculado para período actual (cuando no hay período real en BD)
      const startDate = format(new Date(calculatedPeriods.current.period_start_date + 'T00:00:00'), 'dd MMM');
      const endDate = format(new Date(calculatedPeriods.current.period_end_date + 'T00:00:00'), 'dd MMM yyyy');
      badges.push({ 
        key: 'period', 
        label: `${t('filters.period')}: ${startDate} - ${endDate}` 
      });
    } else if (periodFilter?.startDate && periodFilter?.endDate) {
      // Período con fechas directas
      const startDate = format(new Date(periodFilter.startDate + 'T00:00:00'), 'dd MMM');
      const endDate = format(new Date(periodFilter.endDate + 'T00:00:00'), 'dd MMM yyyy');
      badges.push({ 
        key: 'period', 
        label: `${t('filters.period')}: ${startDate} - ${endDate}` 
      });
    } else {
      badges.push({ key: 'period', label: `${t('filters.period')}: ${t('filters.not_selected')}` });
    }
    
    // Conductor
    if (filters.driverId !== 'all') {
      const driver = drivers.find(d => d.user_id === filters.driverId);
      badges.push({ 
        key: 'driver', 
        label: `${t('filters.driver')}: ${driver ? `${driver.first_name} ${driver.last_name}` : t('filters.selected')}` 
      });
    } else {
      badges.push({ key: 'driver', label: `${t('filters.driver')}: ${t('filters.all')}` });
    }
    
    // Broker
    if (filters.brokerId !== 'all') {
      const broker = brokers.find(b => b === filters.brokerId);
      badges.push({ 
        key: 'broker', 
        label: `${t('filters.broker')}: ${broker || t('filters.selected')}` 
      });
    } else {
      badges.push({ key: 'broker', label: `${t('filters.broker')}: ${t('filters.all')}` });
    }
    
    // Estado
    if (filters.status !== 'all') {
      const statusLabel = t(`common:status.${filters.status}`);
      badges.push({ key: 'status', label: `${t('filters.status')}: ${statusLabel}` });
    } else {
      badges.push({ key: 'status', label: `${t('filters.status')}: ${t('filters.all')}` });
    }
    
    // Búsqueda
    if (filters.search) {
      badges.push({ key: 'search', label: `${t('filters.search')}: "${filters.search}"` });
    }
    
    return badges;
  };

  const badges = getFilterBadges();
  const hasNonDefaultFilters = filters.search !== '' || 
                               filters.driverId !== 'all' || 
                               filters.status !== 'all' || 
                               filters.brokerId !== 'all';

  return (
    <Card className="border-l-4 border-l-primary bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>{t('filters.applied_criteria')}:</span>
            </div>
            
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {badges.map((badge) => (
                <Badge 
                  key={badge.key} 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
          
          {hasNonDefaultFilters && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <FilterX className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t('filters.clear')}</span>
              <span className="sm:hidden">{t('filters.clear_short')}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
