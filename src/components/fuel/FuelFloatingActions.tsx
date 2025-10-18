import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingActionsSheet, FloatingActionTab } from '@/components/ui/FloatingActionsSheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X, Download, Settings, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FuelFilters, FuelFiltersType } from './FuelFilters';
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface FuelFloatingActionsProps {
  filters: FuelFiltersType;
  onFiltersChange: (filters: FuelFiltersType) => void;
}

export function FuelFloatingActions({ filters, onFiltersChange }: FuelFloatingActionsProps) {
  const { t } = useTranslation(['common', 'fuel']);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDateFrom, setSyncDateFrom] = useState('');
  const [syncDateTo, setSyncDateTo] = useState('');
  const { showSuccess, showError } = useFleetNotifications();

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.driverId && filters.driverId !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.vehicleId && filters.vehicleId !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const clearAllFilters = () => {
    onFiltersChange({
      driverId: 'all',
      status: 'all',
      vehicleId: 'all',
      dateRange: { from: undefined, to: undefined }
    });
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  const handleFleetOneSync = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fleetone-sync', {
        body: {
          action: 'sync_transactions',
          dateFrom: syncDateFrom || undefined,
          dateTo: syncDateTo || undefined
        }
      });

      if (error) throw error;

      if (data?.success) {
        showSuccess(
          "Sincronización Exitosa",
          `Se sincronizaron ${data.synced} transacciones. ${data.skipped} ya existían.`
        );
        
        // Refrescar la página para mostrar las nuevas transacciones
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Error en la sincronización');
      }
    } catch (error: any) {
      console.error('Error syncing FleetOne transactions:', error);
      showError(
        "Error de Sincronización",
        error.message || 'No se pudieron sincronizar las transacciones de FleetOne'
      );
    } finally {
      setSyncLoading(false);
    }
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
      id: 'sync',
      label: t('floating_actions.sync.title'),
      icon: RefreshCw,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.sync.title')}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('floating_actions.sync.description')}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom" className="text-xs">{t('floating_actions.sync.date_from')}</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={syncDateFrom}
                        onChange={(e) => setSyncDateFrom(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateTo" className="text-xs">{t('floating_actions.sync.date_to')}</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={syncDateTo}
                        onChange={(e) => setSyncDateTo(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Button 
                        onClick={handleFleetOneSync}
                        disabled={syncLoading}
                        className="w-full"
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", syncLoading && "animate-spin")} />
                        {syncLoading ? t('floating_actions.sync.syncing') : t('floating_actions.sync.sync_transactions')}
                      </Button>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• {t('floating_actions.sync.sync_notes.default_period')}</p>
                        <p>• {t('floating_actions.sync.sync_notes.duplicates_skipped')}</p>
                        <p>• {t('floating_actions.sync.sync_notes.only_assigned')}</p>
                      </div>
                    </div>
                  </div>
                </div>
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