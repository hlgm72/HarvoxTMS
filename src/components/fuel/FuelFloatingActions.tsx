import React from 'react';
import { Button } from '@/components/ui/button';
import { FloatingActionsSheet, FloatingActionTab } from '@/components/ui/FloatingActionsSheet';
import { Filter, X, Download, Settings, BarChart3 } from 'lucide-react';
import { FuelFilters, FuelFiltersType } from './FuelFilters';
import { useTranslation } from 'react-i18next';

interface FuelFloatingActionsProps {
  filters: FuelFiltersType;
  onFiltersChange: (filters: FuelFiltersType) => void;
}

export function FuelFloatingActions({ filters, onFiltersChange }: FuelFloatingActionsProps) {
  const { t } = useTranslation(['common', 'fuel']);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.driverId && filters.driverId !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.vehicleId && filters.vehicleId !== 'all') count++;
    if (filters.periodFilter.type !== 'current') count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  const clearAllFilters = () => {
    onFiltersChange({
      periodFilter: { type: 'current' },
      driverId: 'all',
      status: 'all',
      vehicleId: 'all'
    });
  };

  // Define tabs for FloatingActionsSheet
  const tabs: FloatingActionTab[] = [
    {
      id: 'filters',
      label: t('fuel:floating_actions.filters.title'),
      icon: Filter,
      badge: hasActiveFilters ? '●' : undefined,
      content: (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('fuel:floating_actions.filters.applied_filters')}</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      <X className="h-3 w-3 mr-1" />
                      {t('fuel:floating_actions.filters.clear')}
                    </Button>
                  )}
                </div>

                <FuelFilters 
                  filters={filters} 
                  onFiltersChange={onFiltersChange}
                  compact
                />
              </div>
      )
    },
    {
      id: 'export',
      label: t('floating_actions.export.title'),
      icon: Download,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.export.title')}</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      {t('floating_actions.export.pdf')}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      {t('floating_actions.export.excel')}
                    </Button>
                  </div>
                </div>
              </div>
      )
    },
    {
      id: 'view',
      label: t('floating_actions.view.title'),
      icon: Settings,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.view.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('fuel:floating_actions.view_options')}</p>
                </div>
              </div>
      )
    },
    {
      id: 'stats',
      label: t('floating_actions.stats.title'),
      icon: BarChart3,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.stats.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('fuel:floating_actions.stats_options')}</p>
                </div>
              </div>
      )
    }
  ];

  return (
    <FloatingActionsSheet 
      tabs={tabs}
      buttonLabel={t('floating_actions.title')}
      defaultTab="filters"
    />
  );
}
