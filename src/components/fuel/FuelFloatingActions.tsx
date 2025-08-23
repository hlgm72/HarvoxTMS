import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExpandableFloatingActions } from '@/components/ui/ExpandableFloatingActions';
import { Filter, X, Download, Settings, BarChart3, RefreshCw, Plus } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'export' | 'view' | 'stats' | 'sync'>('filters');
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

  const openSheet = (tab: 'filters' | 'export' | 'view' | 'stats' | 'sync') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

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

  // Definir las acciones para el componente expandible
  const floatingActions = [
    {
      icon: Filter,
      label: hasActiveFilters ? t('floating_actions.filters.filters_active') : t('floating_actions.filters.filters'),
      onClick: () => openSheet('filters'),
      variant: (hasActiveFilters ? 'default' : 'secondary') as 'default' | 'secondary' | 'outline' | 'destructive',
      className: hasActiveFilters ? 'bg-blue-600 hover:bg-blue-700' : ''
    },
    {
      icon: RefreshCw,
      label: t('floating_actions.sync.sync'),
      onClick: () => openSheet('sync'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: Download,
      label: t('floating_actions.export.export'),
      onClick: () => openSheet('export'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: Settings,
      label: t('floating_actions.view.view'),
      onClick: () => openSheet('view'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: BarChart3,
      label: t('floating_actions.stats.statistics'),
      onClick: () => openSheet('stats'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    }
  ];

  return (
    <>
      {/* Botones Flotantes Expandibles */}
      <ExpandableFloatingActions
        actions={floatingActions}
        mainLabel={t('floating_actions.title')}
        position="bottom-right"
      />

      {/* Sheet Modal */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {activeTab === 'filters' && t('floating_actions.filters.title')}
              {activeTab === 'sync' && t('floating_actions.sync.title')}
              {activeTab === 'export' && t('floating_actions.export.title')}
              {activeTab === 'view' && t('floating_actions.view.title')}
              {activeTab === 'stats' && t('floating_actions.stats.title')}
            </SheetTitle>
            <SheetDescription>
              {activeTab === 'filters' && t('floating_actions.filters.description')}
              {activeTab === 'sync' && t('floating_actions.sync.description')}
              {activeTab === 'export' && t('floating_actions.export.description')}
              {activeTab === 'view' && t('floating_actions.view.description')}
              {activeTab === 'stats' && t('floating_actions.stats.description')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Filters Content */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('floating_actions.filters.applied_filters')}</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      <X className="h-3 w-3 mr-1" />
                      {t('floating_actions.filters.clear')}
                    </Button>
                  )}
                </div>

                <FuelFilters 
                  filters={filters} 
                  onFiltersChange={onFiltersChange}
                  compact
                />
              </div>
            )}

            {/* FleetOne Sync Content */}
            {activeTab === 'sync' && (
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
            )}

            {/* Export Content */}
            {activeTab === 'export' && (
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
            )}

            {/* View Content */}
            {activeTab === 'view' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.view.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('fuel:floating_actions.view_options')}</p>
                </div>
              </div>
            )}

            {/* Stats Content */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.stats.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('fuel:floating_actions.stats_options')}</p>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}