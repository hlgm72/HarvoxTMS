import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X, Download, Settings, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FuelFilters, FuelFiltersType } from './FuelFilters';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
        toast({
          title: "Sincronización Exitosa",
          description: `Se sincronizaron ${data.synced} transacciones. ${data.skipped} ya existían.`,
        });
        
        // Refrescar la página para mostrar las nuevas transacciones
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Error en la sincronización');
      }
    } catch (error: any) {
      console.error('Error syncing FleetOne transactions:', error);
      toast({
        title: "Error de Sincronización",
        description: error.message || 'No se pudieron sincronizar las transacciones de FleetOne',
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const actionButtons = [
    {
      id: 'filters',
      icon: Filter,
      label: 'Filtros',
      color: 'text-blue-600 hover:text-blue-700',
      bgColor: 'hover:bg-blue-50',
      hasIndicator: hasActiveFilters
    },
    {
      id: 'sync',
      icon: RefreshCw,
      label: 'FleetOne',
      color: 'text-cyan-600 hover:text-cyan-700',
      bgColor: 'hover:bg-cyan-50',
      hasIndicator: false
    },
    {
      id: 'export',
      icon: Download,
      label: 'Exportar',
      color: 'text-green-600 hover:text-green-700',
      bgColor: 'hover:bg-green-50',
      hasIndicator: false
    },
    {
      id: 'view',
      icon: Settings,
      label: 'Vista',
      color: 'text-purple-600 hover:text-purple-700',
      bgColor: 'hover:bg-purple-50',
      hasIndicator: false
    },
    {
      id: 'stats',
      icon: BarChart3,
      label: 'Estadísticas',
      color: 'text-orange-600 hover:text-orange-700',
      bgColor: 'hover:bg-orange-50',
      hasIndicator: false
    }
  ];

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <TooltipProvider>
          {actionButtons.map((action) => {
            const IconComponent = action.icon;
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-14 w-12 rounded-l-xl rounded-r-none border-r-0 shadow-lg transition-all duration-300",
                      "bg-background/95 backdrop-blur-sm",
                      "hover:w-16 hover:shadow-xl hover:-translate-x-1",
                      action.color,
                      action.bgColor,
                      "relative flex flex-col items-center justify-center gap-1 px-2"
                    )}
                    onClick={() => openSheet(action.id as any)}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-[8px] font-medium leading-none">{action.label}</span>
                    {action.hasIndicator && (
                      <div className="absolute -top-1 left-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="mr-2">
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

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