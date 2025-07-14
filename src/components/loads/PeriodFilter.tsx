import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, CalendarDays, ChevronDown, Clock, X } from 'lucide-react';
import { usePaymentPeriods, useCurrentPaymentPeriod } from '@/hooks/usePaymentPeriods';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export interface PeriodFilterValue {
  type: 'current' | 'all' | 'specific' | 'custom';
  periodId?: string;
  startDate?: string;
  endDate?: string;
  label?: string;
}

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const { data: allPeriods = [] } = usePaymentPeriods({ includeDriverName: true });
  const { data: currentPeriod } = useCurrentPaymentPeriod();

  const getFilterLabel = () => {
    switch (value.type) {
      case 'current':
        return currentPeriod 
          ? `Período Actual (${format(parseISO(currentPeriod.period_start_date), 'dd/MM', { locale: es })} - ${format(parseISO(currentPeriod.period_end_date), 'dd/MM/yy', { locale: es })})`
          : 'Período Actual';
      case 'all':
        return 'Todos los períodos';
      case 'specific':
        const selectedPeriod = allPeriods.find(p => p.id === value.periodId);
        return selectedPeriod 
          ? `${format(parseISO(selectedPeriod.period_start_date), 'dd/MM', { locale: es })} - ${format(parseISO(selectedPeriod.period_end_date), 'dd/MM/yy', { locale: es })}`
          : 'Período específico';
      case 'custom':
        return value.label || 'Rango personalizado';
      default:
        return 'Filtrar por período';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'paid':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'locked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'processing': return 'Procesando';
      case 'closed': return 'Cerrado';
      case 'paid': return 'Pagado';
      case 'locked': return 'Bloqueado';
      default: return status;
    }
  };

  // Agrupar períodos por estado para mejor organización
  const openPeriods = allPeriods.filter(p => p.status === 'open');
  const processingPeriods = allPeriods.filter(p => p.status === 'processing');
  const otherPeriods = allPeriods.filter(p => !['open', 'processing'].includes(p.status));

  const clearFilter = () => {
    onChange({ type: 'current' });
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[200px]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="truncate">{getFilterLabel()}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Opciones rápidas */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Filtros rápidos</h4>
              
              <Button
                variant={value.type === 'current' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => onChange({ type: 'current' })}
              >
                <Clock className="h-4 w-4 mr-2" />
                Período Actual
                {currentPeriod && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {format(parseISO(currentPeriod.period_start_date), 'dd/MM', { locale: es })} - {format(parseISO(currentPeriod.period_end_date), 'dd/MM', { locale: es })}
                  </Badge>
                )}
              </Button>

              <Button
                variant={value.type === 'all' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => onChange({ type: 'all' })}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Todos los períodos
                <Badge variant="secondary" className="ml-auto text-xs">
                  {allPeriods.length}
                </Badge>
              </Button>
            </div>

            {/* Períodos abiertos */}
            {openPeriods.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Períodos Abiertos</h4>
                {openPeriods.slice(0, 3).map((period) => (
                  <Button
                    key={period.id}
                    variant={value.periodId === period.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left"
                    onClick={() => onChange({ 
                      type: 'specific', 
                      periodId: period.id,
                      startDate: period.period_start_date,
                      endDate: period.period_end_date
                    })}
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">
                          {format(parseISO(period.period_start_date), 'dd/MM', { locale: es })} - {format(parseISO(period.period_end_date), 'dd/MM/yy', { locale: es })}
                        </span>
                        <Badge className={`text-xs ${getStatusColor(period.status)}`}>
                          {getStatusText(period.status)}
                        </Badge>
                      </div>
                      {period.driver_name && (
                        <span className="text-xs text-muted-foreground">{period.driver_name}</span>
                      )}
                    </div>
                  </Button>
                ))}
                {openPeriods.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{openPeriods.length - 3} períodos más
                  </div>
                )}
              </div>
            )}

            {/* Períodos en procesamiento */}
            {processingPeriods.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">En Procesamiento</h4>
                {processingPeriods.slice(0, 2).map((period) => (
                  <Button
                    key={period.id}
                    variant={value.periodId === period.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left"
                    onClick={() => onChange({ 
                      type: 'specific', 
                      periodId: period.id,
                      startDate: period.period_start_date,
                      endDate: period.period_end_date
                    })}
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">
                          {format(parseISO(period.period_start_date), 'dd/MM', { locale: es })} - {format(parseISO(period.period_end_date), 'dd/MM/yy', { locale: es })}
                        </span>
                        <Badge className={`text-xs ${getStatusColor(period.status)}`}>
                          {getStatusText(period.status)}
                        </Badge>
                      </div>
                      {period.driver_name && (
                        <span className="text-xs text-muted-foreground">{period.driver_name}</span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Períodos históricos */}
            {otherPeriods.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Períodos Históricos</h4>
                {otherPeriods.slice(0, 2).map((period) => (
                  <Button
                    key={period.id}
                    variant={value.periodId === period.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left"
                    onClick={() => onChange({ 
                      type: 'specific', 
                      periodId: period.id,
                      startDate: period.period_start_date,
                      endDate: period.period_end_date
                    })}
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">
                          {format(parseISO(period.period_start_date), 'dd/MM', { locale: es })} - {format(parseISO(period.period_end_date), 'dd/MM/yy', { locale: es })}
                        </span>
                        <Badge className={`text-xs ${getStatusColor(period.status)}`}>
                          {getStatusText(period.status)}
                        </Badge>
                      </div>
                      {period.driver_name && (
                        <span className="text-xs text-muted-foreground">{period.driver_name}</span>
                      )}
                    </div>
                  </Button>
                ))}
                {otherPeriods.length > 2 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{otherPeriods.length - 2} períodos más
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Botón para limpiar filtro */}
      {value.type !== 'current' && (
        <Button variant="ghost" size="sm" onClick={clearFilter}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}