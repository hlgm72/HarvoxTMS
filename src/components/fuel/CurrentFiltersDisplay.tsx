import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FilterX, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { usePaymentPeriodById } from '@/hooks/usePaymentPeriodById';

interface CurrentFiltersDisplayProps {
  filters: {
    search: string;
    driverId: string;
    status: string;
    vehicleId: string;
    periodFilter: {
      type: string;
      periodId?: string;
    };
  };
  drivers: any[];
  vehicles: any[];
  onClearFilters: () => void;
}

export function CurrentFiltersDisplay({
  filters,
  drivers,
  vehicles,
  onClearFilters
}: CurrentFiltersDisplayProps) {
  const { t } = useTranslation(['fuel', 'common']);
  
  // Obtener información del período por ID
  const { data: periodData } = usePaymentPeriodById(filters.periodFilter?.periodId);
  
  const getFilterBadges = () => {
    const badges = [];
    
    console.log('🔍 Generando badges - periodId:', filters.periodFilter?.periodId);
    console.log('📅 Datos del período obtenidos:', periodData);
    
    // Período actual - siempre mostrar si hay periodId
    if (filters.periodFilter?.periodId) {
      if (periodData) {
        const startDate = format(new Date(periodData.period_start_date), 'dd MMM');
        const endDate = format(new Date(periodData.period_end_date), 'dd MMM yyyy');
        console.log('📅 Fechas formateadas:', { startDate, endDate });
        badges.push({ 
          key: 'period', 
          label: `Período: ${startDate} - ${endDate}` 
        });
      } else {
        badges.push({ 
          key: 'period', 
          label: 'Período: Cargando...' 
        });
      }
    } else {
      badges.push({ key: 'period', label: 'Período: No seleccionado' });
    }
    
    // Conductor
    if (filters.driverId !== 'all') {
      const driver = drivers.find(d => d.user_id === filters.driverId);
      badges.push({ 
        key: 'driver', 
        label: `Conductor: ${driver ? `${driver.first_name} ${driver.last_name}` : 'Seleccionado'}` 
      });
    } else {
      badges.push({ key: 'driver', label: 'Conductor: Todos' });
    }
    
    // Vehículo
    if (filters.vehicleId !== 'all') {
      const vehicle = vehicles.find(v => v.id === filters.vehicleId);
      badges.push({ 
        key: 'vehicle', 
        label: `Vehículo: ${vehicle ? vehicle.plate_number : 'Seleccionado'}` 
      });
    } else {
      badges.push({ key: 'vehicle', label: 'Vehículo: Todos' });
    }
    
    // Estado
    if (filters.status !== 'all') {
      badges.push({ key: 'status', label: `Estado: ${filters.status}` });
    } else {
      badges.push({ key: 'status', label: 'Estado: Todos' });
    }
    
    // Búsqueda
    if (filters.search) {
      badges.push({ key: 'search', label: `Búsqueda: "${filters.search}"` });
    }
    
    return badges;
  };

  const badges = getFilterBadges();
  const hasNonDefaultFilters = filters.search !== '' || 
                               filters.driverId !== 'all' || 
                               filters.status !== 'all' || 
                               filters.vehicleId !== 'all';

  return (
    <Card className="border-l-4 border-l-primary bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>Criterios aplicados:</span>
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
              <span className="hidden sm:inline">Limpiar filtros</span>
              <span className="sm:hidden">Limpiar</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}