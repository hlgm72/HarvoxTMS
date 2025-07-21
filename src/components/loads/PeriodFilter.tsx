
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, CalendarDays, ChevronDown, Clock, X, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { usePaymentPeriods, useCurrentPaymentPeriod, usePreviousPaymentPeriod } from '@/hooks/usePaymentPeriods';
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { es } from 'date-fns/locale';

export interface PeriodFilterValue {
  type: 'current' | 'previous' | 'all' | 'specific' | 'custom' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
  periodId?: string;
  startDate?: string;
  endDate?: string;
  label?: string;
}

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
  isLoading?: boolean;
}

export function PeriodFilter({ value, onChange, isLoading = false }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: allPeriods = [] } = usePaymentPeriods();
  const { data: currentPeriod } = useCurrentPaymentPeriod();
  const { data: previousPeriod } = usePreviousPaymentPeriod();

  const getDateRangeForType = (type: string) => {
    const now = new Date();
    
    switch (type) {
      case 'this_month':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: `Este mes (${format(now, 'MMMM yyyy', { locale: es })})`
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
          label: `Mes pasado (${format(lastMonth, 'MMMM yyyy', { locale: es })})`
        };
      case 'this_quarter':
        return {
          startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
          label: `Este trimestre (Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()})`
        };
      case 'last_quarter':
        const lastQuarter = subQuarters(now, 1);
        return {
          startDate: format(startOfQuarter(lastQuarter), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(lastQuarter), 'yyyy-MM-dd'),
          label: `Trimestre pasado (Q${Math.ceil((lastQuarter.getMonth() + 1) / 3)} ${lastQuarter.getFullYear()})`
        };
      case 'this_year':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(endOfYear(now), 'yyyy-MM-dd'),
          label: `Este año (${now.getFullYear()})`
        };
      case 'last_year':
        const lastYear = subYears(now, 1);
        return {
          startDate: format(startOfYear(lastYear), 'yyyy-MM-dd'),
          endDate: format(endOfYear(lastYear), 'yyyy-MM-dd'),
          label: `Año pasado (${lastYear.getFullYear()})`
        };
      default:
        return null;
    }
  };

  const getFilterLabel = () => {
    switch (value.type) {
      case 'current':
        return currentPeriod 
          ? `Período Actual (${format(parseISO(currentPeriod.period_start_date), 'dd/MM', { locale: es })} - ${format(parseISO(currentPeriod.period_end_date), 'dd/MM/yy', { locale: es })})`
          : 'Período Actual';
      case 'previous':
        return previousPeriod 
          ? `Período Anterior (${format(parseISO(previousPeriod.period_start_date), 'dd/MM', { locale: es })} - ${format(parseISO(previousPeriod.period_end_date), 'dd/MM/yy', { locale: es })})`
          : 'Período Anterior';
      case 'all':
        return 'Todos los períodos';
      case 'specific':
        const selectedPeriod = allPeriods.find(p => p.id === value.periodId);
        return selectedPeriod 
          ? `${format(parseISO(selectedPeriod.period_start_date), 'dd/MM', { locale: es })} - ${format(parseISO(selectedPeriod.period_end_date), 'dd/MM/yy', { locale: es })}`
          : 'Período específico';
      case 'this_month':
      case 'last_month':
      case 'this_quarter':
      case 'last_quarter':
      case 'this_year':
      case 'last_year':
        const dateRange = getDateRangeForType(value.type);
        return dateRange?.label || 'Rango de fechas';
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

  const handleDateRangeSelect = (type: string) => {
    const dateRange = getDateRangeForType(type);
    if (dateRange) {
      onChange({
        type: type as any,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        label: dateRange.label
      });
      setOpen(false);
    }
  };

  // Agrupar períodos por estado para mejor organización
  const openPeriods = allPeriods.filter(p => p.status === 'open');
  const processingPeriods = allPeriods.filter(p => p.status === 'processing');
  const otherPeriods = allPeriods.filter(p => !['open', 'processing'].includes(p.status));

  const clearFilter = () => {
    onChange({ type: 'current' });
  };

  const handleOptionSelect = (option: PeriodFilterValue) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="justify-between min-w-[200px]"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
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
                onClick={() => {
                  if (currentPeriod) {
                    handleOptionSelect({ 
                      type: 'current',
                      periodId: currentPeriod.id,
                      startDate: currentPeriod.period_start_date,
                      endDate: currentPeriod.period_end_date
                    });
                  } else {
                    handleOptionSelect({ type: 'current' });
                  }
                }}
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
                variant={value.type === 'previous' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  if (previousPeriod) {
                    handleOptionSelect({ 
                      type: 'previous',
                      periodId: previousPeriod.id,
                      startDate: previousPeriod.period_start_date,
                      endDate: previousPeriod.period_end_date
                    });
                  }
                }}
                disabled={!previousPeriod}
              >
                <Clock className="h-4 w-4 mr-2" />
                Período Anterior
                {previousPeriod && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {format(parseISO(previousPeriod.period_start_date), 'dd/MM', { locale: es })} - {format(parseISO(previousPeriod.period_end_date), 'dd/MM', { locale: es })}
                  </Badge>
                )}
              </Button>

              <Button
                variant={value.type === 'all' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleOptionSelect({ type: 'all' })}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Todos los períodos
                <Badge variant="secondary" className="ml-auto text-xs">
                  {allPeriods.length}
                </Badge>
              </Button>
            </div>

            {/* Filtros por fechas inteligentes */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Por fechas</h4>
              
              <Button
                variant={value.type === 'this_month' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleDateRangeSelect('this_month')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Este mes
                <Badge variant="secondary" className="ml-auto text-xs">
                  {format(new Date(), 'MMM', { locale: es })}
                </Badge>
              </Button>

              <Button
                variant={value.type === 'last_month' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleDateRangeSelect('last_month')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Mes pasado
                <Badge variant="secondary" className="ml-auto text-xs">
                  {format(subMonths(new Date(), 1), 'MMM', { locale: es })}
                </Badge>
              </Button>

              <Button
                variant={value.type === 'this_quarter' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleDateRangeSelect('this_quarter')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Este trimestre
                <Badge variant="secondary" className="ml-auto text-xs">
                  Q{Math.ceil((new Date().getMonth() + 1) / 3)}
                </Badge>
              </Button>

              <Button
                variant={value.type === 'last_quarter' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleDateRangeSelect('last_quarter')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Trimestre pasado
                <Badge variant="secondary" className="ml-auto text-xs">
                  Q{Math.ceil((subQuarters(new Date(), 1).getMonth() + 1) / 3)}
                </Badge>
              </Button>

              <Button
                variant={value.type === 'this_year' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleDateRangeSelect('this_year')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Este año
                <Badge variant="secondary" className="ml-auto text-xs">
                  {new Date().getFullYear()}
                </Badge>
              </Button>

              <Button
                variant={value.type === 'last_year' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleDateRangeSelect('last_year')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Año pasado
                <Badge variant="secondary" className="ml-auto text-xs">
                  {subYears(new Date(), 1).getFullYear()}
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
                    onClick={() => handleOptionSelect({ 
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
                      {/* Driver name not needed for company periods */}
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
                    onClick={() => handleOptionSelect({ 
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
                      {/* Driver name not needed for company periods */}
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
                    onClick={() => handleOptionSelect({ 
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
                      {/* Driver name not needed for company periods */}
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
