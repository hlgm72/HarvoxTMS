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

interface FuelFloatingActionsProps {
  filters: FuelFiltersType;
  onFiltersChange: (filters: FuelFiltersType) => void;
}

export function FuelFloatingActions({ filters, onFiltersChange }: FuelFloatingActionsProps) {
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
      label: hasActiveFilters ? 'Filtros (activos)' : 'Filtros',
      onClick: () => openSheet('filters'),
      variant: (hasActiveFilters ? 'default' : 'secondary') as 'default' | 'secondary' | 'outline' | 'destructive',
      className: hasActiveFilters ? 'bg-blue-600 hover:bg-blue-700' : ''
    },
    {
      icon: RefreshCw,
      label: 'FleetOne',
      onClick: () => openSheet('sync'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: Download,
      label: 'Exportar',
      onClick: () => openSheet('export'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: Settings,
      label: 'Vista',
      onClick: () => openSheet('view'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: BarChart3,
      label: 'Estadísticas',
      onClick: () => openSheet('stats'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    }
  ];

  return (
    <>
      {/* Botones Flotantes Expandibles */}
      <ExpandableFloatingActions
        actions={floatingActions}
        mainIcon={Plus}
        mainLabel="Acciones de Combustible"
        position="bottom-right"
      />

      {/* Sheet Modal */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {activeTab === 'filters' && 'Filtros de Combustible'}
              {activeTab === 'sync' && 'Sincronización FleetOne'}
              {activeTab === 'export' && 'Exportar Datos'}
              {activeTab === 'view' && 'Configuración de Vista'}
              {activeTab === 'stats' && 'Estadísticas'}
            </SheetTitle>
            <SheetDescription>
              {activeTab === 'filters' && 'Filtra los gastos de combustible por diferentes criterios'}
              {activeTab === 'sync' && 'Sincroniza transacciones directamente desde la API de FleetOne'}
              {activeTab === 'export' && 'Exporta los datos de combustible en diferentes formatos'}
              {activeTab === 'view' && 'Personaliza cómo se muestran los gastos'}
              {activeTab === 'stats' && 'Ve estadísticas rápidas de combustible'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Filters Content */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Filtros Aplicados</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
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
                  <h3 className="text-sm font-medium mb-3">Sincronización con FleetOne</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Sincroniza transacciones directamente desde la API de FleetOne para obtener datos históricos o verificar transacciones.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom" className="text-xs">Fecha desde (opcional)</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={syncDateFrom}
                        onChange={(e) => setSyncDateFrom(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateTo" className="text-xs">Fecha hasta (opcional)</Label>
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
                        {syncLoading ? 'Sincronizando...' : 'Sincronizar Transacciones'}
                      </Button>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Si no especificas fechas, se sincronizarán los últimos 7 días</p>
                        <p>• Las transacciones duplicadas serán omitidas automáticamente</p>
                        <p>• Solo se sincronizarán las tarjetas FleetOne asignadas en el sistema</p>
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
                  <h3 className="text-sm font-medium mb-3">Exportar Datos</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar a PDF
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar a Excel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* View Content */}
            {activeTab === 'view' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Configuración de Vista</h3>
                  <p className="text-sm text-muted-foreground">Opciones de vista próximamente.</p>
                </div>
              </div>
            )}

            {/* Stats Content */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Estadísticas</h3>
                  <p className="text-sm text-muted-foreground">Estadísticas próximamente.</p>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}