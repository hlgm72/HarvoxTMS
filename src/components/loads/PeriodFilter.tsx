
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
import { formatPaymentPeriod, formatPaymentPeriodCompact, formatPaymentPeriodBadge, formatDateOnly, formatMonthName, formatDateInUserTimeZone, getTodayInUserTimeZone } from '@/lib/dateFormatting';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useCompanyFinancialData } from '@/hooks/useSecureCompanyData';

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
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);
  
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
        if (currentPeriod) {
          return `${t('periods.current')} (${formatPaymentPeriodBadge(currentPeriod.period_start_date, currentPeriod.period_end_date)})`;
        } else if (currentPeriodDates) {
          return `${t('periods.current')} (${formatPaymentPeriodBadge(currentPeriodDates.startDate, currentPeriodDates.endDate)})`;
        } else {
          return t('periods.current');
        }
      case 'previous':
        return previousPeriod 
          ? `${t('periods.previous')} (${formatPaymentPeriodBadge(previousPeriod.period_start_date, previousPeriod.period_end_date)})`
          : t('periods.previous');
      case 'next':
        return nextPeriod 
          ? `${t('periods.next')} (${formatPaymentPeriodBadge(nextPeriod.period_start_date, nextPeriod.period_end_date)})`
          : t('periods.next');
      case 'all':
        return t('periods.all');
      case 'specific':
        const selectedPeriod = allPeriods.find(p => p.id === value.periodId);
        return selectedPeriod 
          ? `${formatPaymentPeriodBadge(selectedPeriod.period_start_date, selectedPeriod.period_end_date)}`
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

  // Calcular fechas del período actual basándose en la frecuencia de pago predeterminada
  const getCurrentPeriodDates = () => {
    // Verificar si companyData existe y acceder correctamente al default_payment_frequency
    const company = Array.isArray(companyData) ? companyData[0] : companyData;
    if (!company?.default_payment_frequency) return null;
    
    const today = new Date();
    const currentDate = getTodayInUserTimeZone();
    
    switch (company.default_payment_frequency) {
      case 'weekly': {
        // Obtener el domingo de la semana actual (inicio de semana)
        const dayOfWeek = today.getDay(); // 0 = domingo
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return {
          startDate: formatDateInUserTimeZone(startOfWeek),
          endDate: formatDateInUserTimeZone(endOfWeek)
        };
      }
      case 'bi-weekly': {
        // Para bi-semanal, necesitamos determinar si estamos en semana par o impar
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((today.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000) + yearStart.getDay() + 1) / 7);
        const isEvenWeek = weekNumber % 2 === 0;
        
        const dayOfWeek = today.getDay();
        let periodStart = new Date(today);
        periodStart.setDate(today.getDate() - dayOfWeek);
        
        if (isEvenWeek) {
          // Si estamos en semana par, el período comenzó la semana pasada
          periodStart.setDate(periodStart.getDate() - 7);
        }
        
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 13); // 14 días - 1
        
        return {
          startDate: formatDateInUserTimeZone(periodStart),
          endDate: formatDateInUserTimeZone(periodEnd)
        };
      }
      case 'monthly': {
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = endOfMonth(today);
        
        return {
          startDate: formatDateInUserTimeZone(startOfCurrentMonth),
          endDate: formatDateInUserTimeZone(endOfCurrentMonth)
        };
      }
      default:
        return null;
    }
  };

  const currentPeriodDates = getCurrentPeriodDates();

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
        <PopoverContent 
          className="w-72 sm:w-80 p-0 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 border border-border shadow-lg z-[100]" 
          align="center" 
          side="bottom"
          sideOffset={4}
          alignOffset={0}
          avoidCollisions={true}
          collisionPadding={8}
          style={{ maxHeight: '50vh', overflow: 'auto' }}
        >
          <div className="p-4 space-y-4" style={{ maxHeight: '48vh', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Opciones rápidas */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">{t('period_filter.quick_filters')}</h4>
              
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
                {t('periods.previous')}
                {previousPeriod && (
                  <Badge variant="secondary" className="ml-auto text-[8px] md:text-[10px]">
                    {formatPaymentPeriodBadge(previousPeriod.period_start_date, previousPeriod.period_end_date)}
                  </Badge>
                )}
              </Button>

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
                 {t('periods.current')}
                 {(currentPeriod || currentPeriodDates) && (
                   <Badge variant="outline" className="ml-auto text-[8px] md:text-[10px] bg-white/90 text-slate-700 border-slate-300">
                     {currentPeriod 
                       ? formatPaymentPeriodBadge(currentPeriod.period_start_date, currentPeriod.period_end_date)
                       : currentPeriodDates && formatPaymentPeriodBadge(currentPeriodDates.startDate, currentPeriodDates.endDate)
                     }
                   </Badge>
                 )}
              </Button>

              <Button
                variant={value.type === 'next' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  if (nextPeriod) {
                    handleOptionSelect({ 
                      type: 'next',
                      periodId: nextPeriod.id,
                      startDate: nextPeriod.period_start_date,
                      endDate: nextPeriod.period_end_date
                    });
                  }
                }}
                disabled={!nextPeriod}
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('periods.next')}
                {nextPeriod && (
                  <Badge variant="secondary" className="ml-auto text-[8px] md:text-[10px]">
                    {formatPaymentPeriodBadge(nextPeriod.period_start_date, nextPeriod.period_end_date)}
                  </Badge>
                )}
              </Button>

              <Button
                variant={value.type === 'all' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleOptionSelect({ type: 'all' })}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                {t('periods.all')}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {allPeriods.length}
                </Badge>
              </Button>
            </div>

            {/* Filtro de período usando el sistema que funciona bien */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('payments:filters.period_label')}</label>
              <Select 
                value={value.type || 'current'} 
                onValueChange={(type) => {
                  // Usar la misma lógica que funciona en LoadsFloatingActions
                  const newFilter: PeriodFilterValue = { type: type as any };
                  
                  // Calcular fechas para períodos basados en fechas
                  const dateRange = getDateRangeForType(type);
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
                  <SelectValue placeholder={t('payments:filters.select_period_placeholder')} />
                </SelectTrigger>
                <SelectContent className="max-h-[40vh]">
                  <SelectItem value="current">{t('periods.current')}</SelectItem>
                  <SelectItem value="previous">{t('periods.previous')}</SelectItem>
                  <SelectItem value="next">{t('payments:filters.period_options.next')}</SelectItem>
                  <SelectItem value="all">{t('payments:filters.period_options.all')}</SelectItem>
                  <SelectItem value="this_month">{t('payments:filters.period_options.this_month')}</SelectItem>
                  <SelectItem value="last_month">{t('payments:filters.period_options.last_month')}</SelectItem>
                  <SelectItem value="this_quarter">{t('payments:filters.period_options.this_quarter')}</SelectItem>
                  <SelectItem value="last_quarter">{t('payments:filters.period_options.last_quarter')}</SelectItem>
                  <SelectItem value="this_year">{t('payments:filters.period_options.this_year')}</SelectItem>
                  <SelectItem value="last_year">{t('payments:filters.period_options.last_year')}</SelectItem>
                  <SelectItem value="specific">{t('payments:filters.period_options.specific')}</SelectItem>
                </SelectContent>
              </Select>
              {value.type && value.type !== 'current' && (
                <div className="text-xs text-muted-foreground">
                  {getFilterLabel()}
                </div>
              )}
            </div>

            <Separator />

            {/* Períodos abiertos */}
            {openPeriods.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center justify-between">
                  {t('period_filter.open_periods')}
                  <Badge variant="secondary" className="text-xs">
                    {openPeriods.length}
                  </Badge>
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {openPeriods.map((period) => (
                    <Button
                      key={period.id}
                      variant={value.periodId === period.id ? 'default' : 'ghost'}
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleOptionSelect({ 
                        type: 'specific', 
                        periodId: period.id,
                        startDate: period.period_start_date,
                        endDate: period.period_end_date
                      })}
                    >
                      <div className="flex flex-col items-start w-full min-w-0">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="text-sm truncate flex-1 min-w-0">
                            {formatPaymentPeriodCompact(period.period_start_date, period.period_end_date)}
                          </span>
                          <Badge className={`text-xs flex-shrink-0 ${getStatusColor(period.status)}`}>
                            {getStatusText(period.status)}
                          </Badge>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Períodos en procesamiento */}
            {processingPeriods.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">{t('period_filter.processing')}</h4>
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
                          {formatPaymentPeriodCompact(period.period_start_date, period.period_end_date)}
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
                <h4 className="font-medium text-sm text-muted-foreground">{t('period_filter.historical_periods')}</h4>
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
                          {formatPaymentPeriodCompact(period.period_start_date, period.period_end_date)}
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
                    +{otherPeriods.length - 2} {t('period_filter.more_periods', 'más períodos')}
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

    </div>
  );
}
