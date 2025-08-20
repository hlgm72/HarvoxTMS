
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, CalendarDays, ChevronDown, Clock, X, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { usePaymentPeriods, useCurrentPaymentPeriod, usePreviousPaymentPeriod, useNextPaymentPeriod } from '@/hooks/usePaymentPeriods';
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPaymentPeriod, formatPaymentPeriodCompact, formatPaymentPeriodBadge, formatDateOnly, formatMonthName, formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { useCompanyCache } from '@/hooks/useCompanyCache';

export interface PeriodFilterValue {
  type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
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
  const { t, i18n } = useTranslation(['loads', 'common']);
  const [open, setOpen] = useState(false);
  
  // Importar el useCompanyCache para obtener el company_id
  const { userCompany } = useCompanyCache();
  
  // Pasar el companyId a todos los hooks de períodos
  const { data: allPeriods = [] } = usePaymentPeriods();
  const { data: currentPeriod } = useCurrentPaymentPeriod(userCompany?.company_id);
  const { data: previousPeriod } = usePreviousPaymentPeriod(userCompany?.company_id);
  const { data: nextPeriod } = useNextPaymentPeriod(userCompany?.company_id);

  const getDateRangeForType = (type: string) => {
    const now = new Date();
    
    switch (type) {
      case 'this_month':
        return {
           startDate: formatDateInUserTimeZone(startOfMonth(now)),
           endDate: formatDateInUserTimeZone(endOfMonth(now)),
          label: `${t('periods.this_month')} (${formatMonthName(now)} ${now.getFullYear()})`
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
           startDate: formatDateInUserTimeZone(startOfMonth(lastMonth)),
           endDate: formatDateInUserTimeZone(endOfMonth(lastMonth)),
          label: `${t('periods.last_month')} (${formatMonthName(lastMonth)} ${lastMonth.getFullYear()})`
        };
      case 'this_quarter':
        return {
           startDate: formatDateInUserTimeZone(startOfQuarter(now)),
           endDate: formatDateInUserTimeZone(endOfQuarter(now)),
          label: `${t('periods.this_quarter')} (Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()})`
        };
      case 'last_quarter':
        const lastQuarter = subQuarters(now, 1);
        return {
           startDate: formatDateInUserTimeZone(startOfQuarter(lastQuarter)),
           endDate: formatDateInUserTimeZone(endOfQuarter(lastQuarter)),
          label: `${t('periods.last_quarter')} (Q${Math.ceil((lastQuarter.getMonth() + 1) / 3)} ${lastQuarter.getFullYear()})`
        };
      case 'this_year':
        return {
           startDate: formatDateInUserTimeZone(startOfYear(now)),
           endDate: formatDateInUserTimeZone(endOfYear(now)),
          label: `${t('periods.this_year')} (${now.getFullYear()})`
        };
      case 'last_year':
        const lastYear = subYears(now, 1);
        return {
           startDate: formatDateInUserTimeZone(startOfYear(lastYear)),
           endDate: formatDateInUserTimeZone(endOfYear(lastYear)),
          label: `${t('periods.last_year')} (${lastYear.getFullYear()})`
        };
      default:
        return null;
    }
  };

  const getFilterLabel = () => {
    switch (value.type) {
      case 'current':
        return currentPeriod 
          ? `${t('periods.current')} (${formatPaymentPeriod(currentPeriod.period_start_date, currentPeriod.period_end_date)})`
          : t('periods.current');
      case 'previous':
        return previousPeriod 
          ? `${t('periods.previous')} (${formatPaymentPeriod(previousPeriod.period_start_date, previousPeriod.period_end_date)})`
          : t('periods.previous');
      case 'next':
        return nextPeriod 
          ? `${t('periods.next')} (${formatPaymentPeriod(nextPeriod.period_start_date, nextPeriod.period_end_date)})`
          : t('periods.next');
      case 'all':
        return t('periods.all');
      case 'specific':
        const selectedPeriod = allPeriods.find(p => p.id === value.periodId);
        return selectedPeriod 
          ? formatPaymentPeriod(selectedPeriod.period_start_date, selectedPeriod.period_end_date)
          : t('periods.specific');
      case 'this_month':
      case 'last_month':
      case 'this_quarter':
      case 'last_quarter':
      case 'this_year':
      case 'last_year':
        const dateRange = getDateRangeForType(value.type);
        return dateRange?.label || t('periods.custom');
      case 'custom':
        return value.label || t('periods.custom');
      default:
        return t('periods.current');
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
      case 'open': return t('period_filter.status.open');
      case 'processing': return t('period_filter.status.processing');
      case 'closed': return t('period_filter.status.closed');
      case 'paid': return t('period_filter.status.paid');
      case 'locked': return t('period_filter.status.locked');
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
            className="justify-between min-w-[200px] bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
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
        <PopoverContent className="w-80 p-0 bg-white dark:bg-gray-800 border border-border shadow-lg z-50" align="start">
          <div className="p-4">
            {/* EXACTAMENTE el mismo sistema que funciona en LoadsFloatingActions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período de Pago</label>
              <Select 
                value={value.type || 'current'} 
                onValueChange={(filterValue) => {
                  // EXACTAMENTE la misma lógica que funciona en LoadsFloatingActions
                  const newFilter: any = { type: filterValue };
                  
                  // EXACTAMENTE la misma función getDateRangeForType que funciona
                  const getDateRangeForType = (type: string) => {
                    const now = new Date();
                    
                    switch (type) {
                      case 'this_month':
                        return {
                          startDate: formatDateInUserTimeZone(startOfMonth(now)),
                          endDate: formatDateInUserTimeZone(endOfMonth(now)),
                          label: `${t('periods.this_month')} (${formatMonthName(now)} ${now.getFullYear()})`
                        };
                      case 'last_month':
                        const lastMonth = subMonths(now, 1);
                        return {
                          startDate: formatDateInUserTimeZone(startOfMonth(lastMonth)),
                          endDate: formatDateInUserTimeZone(endOfMonth(lastMonth)),
                          label: `${t('periods.last_month')} (${formatMonthName(lastMonth)} ${lastMonth.getFullYear()})`
                        };
                      case 'this_quarter':
                        return {
                          startDate: formatDateInUserTimeZone(startOfQuarter(now)),
                          endDate: formatDateInUserTimeZone(endOfQuarter(now)),
                          label: `${t('periods.this_quarter')} (Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()})`
                        };
                      case 'last_quarter':
                        const lastQuarter = subQuarters(now, 1);
                        return {
                          startDate: formatDateInUserTimeZone(startOfQuarter(lastQuarter)),
                          endDate: formatDateInUserTimeZone(endOfQuarter(lastQuarter)),
                          label: `${t('periods.last_quarter')} (Q${Math.ceil((lastQuarter.getMonth() + 1) / 3)} ${lastQuarter.getFullYear()})`
                        };
                      case 'this_year':
                        return {
                          startDate: formatDateInUserTimeZone(startOfYear(now)),
                          endDate: formatDateInUserTimeZone(endOfYear(now)),
                          label: `${t('periods.this_year')} (${now.getFullYear()})`
                        };
                      case 'last_year':
                        const lastYear = subYears(now, 1);
                        return {
                          startDate: formatDateInUserTimeZone(startOfYear(lastYear)),
                          endDate: formatDateInUserTimeZone(endOfYear(lastYear)),
                          label: `${t('periods.last_year')} (${lastYear.getFullYear()})`
                        };
                      default:
                        return null;
                    }
                  };
                  
                  // Calculate dates for date-based periods - EXACTAMENTE igual
                  const dateRange = getDateRangeForType(filterValue);
                  if (dateRange) {
                    newFilter.startDate = dateRange.startDate;
                    newFilter.endDate = dateRange.endDate;
                    newFilter.label = dateRange.label;
                  }
                  
                  onChange(newFilter);
                  setOpen(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">{t('periods.current')}</SelectItem>
                  <SelectItem value="previous">{t('periods.previous')}</SelectItem>
                  <SelectItem value="next">Período Siguiente</SelectItem>
                  <SelectItem value="all">Todos los Períodos</SelectItem>
                  <SelectItem value="this_month">Este Mes</SelectItem>
                  <SelectItem value="last_month">Mes Pasado</SelectItem>
                  <SelectItem value="this_quarter">Este Trimestre</SelectItem>
                  <SelectItem value="last_quarter">Trimestre Pasado</SelectItem>
                  <SelectItem value="this_year">Este Año</SelectItem>
                  <SelectItem value="last_year">Año Pasado</SelectItem>
                  <SelectItem value="specific">Período Específico...</SelectItem>
                </SelectContent>
              </Select>
              {value.type && value.type !== 'current' && (
                <div className="text-xs text-muted-foreground">
                  {getFilterLabel()}
                  {value.label && ` - ${value.label}`}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

    </div>
  );
}
