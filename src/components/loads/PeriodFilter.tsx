import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLogger, business } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, CalendarDays, ChevronDown, Clock, Loader2 } from 'lucide-react';
import { usePaymentPeriods, useCurrentPaymentPeriod, usePreviousPaymentPeriod, useNextPaymentPeriod } from '@/hooks/usePaymentPeriods';
import { useCalculatedPeriods } from '@/hooks/useCalculatedPeriods';
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPaymentPeriod, formatPaymentPeriodCompact, formatPaymentPeriodBadge, formatDateOnly, formatMonthName, formatDateInUserTimeZone, getTodayInUserTimeZone, formatDetailedPaymentPeriod } from '@/lib/dateFormatting';
import { calculatePreviousPeriod } from '@/utils/periodCalculations';
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
  const log = useLogger('PeriodFilter');
  
  // Importar el useCompanyCache para obtener el company_id
  const { userCompany } = useCompanyCache();
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);
  
  // Pasar el companyId a todos los hooks de períodos
  const { data: allPeriods = [] } = usePaymentPeriods();
  const { data: currentPeriod } = useCurrentPaymentPeriod(userCompany?.company_id);
  const { data: previousPeriod } = usePreviousPaymentPeriod(userCompany?.company_id);
  const { data: nextPeriod } = useNextPaymentPeriod(userCompany?.company_id);
  
  // Obtener períodos calculados para mostrar en el dropdown
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);

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
        // Mostrar período calculado si no hay período real
        const displayCurrentPeriod = currentPeriod || calculatedPeriods?.current;
        if (displayCurrentPeriod) {
          // ✅ NUEVO FORMATO: "Current: W35/2025 (08/25 - 08/31)"
          const periodLabel = formatDetailedPaymentPeriod(
            displayCurrentPeriod.period_start_date, 
            displayCurrentPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          console.log('🔍 PeriodFilter Current - formatDetailedPaymentPeriod result:', { periodLabel });
          // Extraer solo la parte del número de semana/mes y reemplazar "Week" con "W"
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W'); // "W35/2025" o "AGO/2025"
          console.log('🔍 PeriodFilter Current - periodNumber after replace:', { periodNumber });
          const dateRange = formatPaymentPeriodBadge(displayCurrentPeriod.period_start_date, displayCurrentPeriod.period_end_date);
          return `Current: ${periodNumber} (${dateRange})`;
        } else {
          return 'Current';
        }
      case 'previous':
        // Usar la misma lógica que current - calcular directo si no hay BD
        let displayPreviousPeriod = previousPeriod;
        
        if (!displayPreviousPeriod && userCompany?.company_id && companyData) {
          // Calcular período anterior directamente
          const companyConfig = {
            default_payment_frequency: (Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency) as 'weekly' | 'biweekly' | 'monthly',
            payment_cycle_start_day: (Array.isArray(companyData) ? companyData[0]?.payment_cycle_start_day : companyData?.payment_cycle_start_day) || 1
          };
          const previousCalc = calculatePreviousPeriod(companyConfig);
          displayPreviousPeriod = {
            id: 'calculated-previous',
            company_id: userCompany.company_id,
            period_start_date: previousCalc.startDate,
            period_end_date: previousCalc.endDate,
            period_frequency: previousCalc.frequency,
            status: 'calculated',
            period_type: 'regular'
          };
        }
        
        if (displayPreviousPeriod) {
          const periodLabel = formatDetailedPaymentPeriod(
            displayPreviousPeriod.period_start_date, 
            displayPreviousPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          console.log('🔍 PeriodFilter Previous - formatDetailedPaymentPeriod result:', { periodLabel });
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
          console.log('🔍 PeriodFilter Previous - periodNumber after replace:', { periodNumber });
          const dateRange = formatPaymentPeriodBadge(displayPreviousPeriod.period_start_date, displayPreviousPeriod.period_end_date);
          return `Previous: ${periodNumber} (${dateRange})`;
        } else {
          return 'Previous';
        }
      case 'next':
        const displayNextPeriod = nextPeriod || calculatedPeriods?.next;
        return displayNextPeriod 
          ? `${t('periods.next')} (${formatPaymentPeriodBadge(displayNextPeriod.period_start_date, displayNextPeriod.period_end_date)})`
          : t('periods.next');
      case 'all':
        return t('periods.all');
      case 'specific':
        const selectedPeriod = allPeriods.find(p => p.id === value.periodId);
        return selectedPeriod 
          ? formatDetailedPaymentPeriod(
              selectedPeriod.period_start_date, 
              selectedPeriod.period_end_date, 
              Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
            )
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

  // ❌ REMOVIDO: No usar fechas calculadas, siempre usar períodos de BD
  // El período actual SIEMPRE debe venir de la base de datos

  const clearFilter = () => {
    onChange({ type: 'current' });
  };

  const handleOptionSelect = (option: PeriodFilterValue) => {
    // Log solo en desarrollo - no irá a Sentry en producción
    log.debug('Period filter selection', { 
      type: option.type, 
      periodId: option.periodId,
      label: option.label 
    });
    
    // Log de negocio para analytics (desarrollo solamente)
    business.payment('period_filter_changed', {
      filterType: option.type,
      periodId: option.periodId
    });
    
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Button 
          variant="outline" 
          className="justify-between min-w-[200px] sm:min-w-[200px] w-full sm:w-auto bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
          disabled={isLoading}
          onClick={() => setOpen(!open)}
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

        {open && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)}
            />
            
        {/* Dropdown content con fondo sólido y z-index alto */}
        <div className="absolute top-full left-0 mt-1 w-screen max-w-sm sm:w-[21rem] bg-white border border-gray-200 rounded-md shadow-xl z-50 -ml-4 sm:ml-0"
             style={{ backgroundColor: 'white' }}>
              <div className="p-4 space-y-4">
                {/* Opciones rápidas */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">{t('period_filter.quick_filters')}</h4>
                  
                    <Button
                     variant={value.type === 'previous' ? 'default' : 'ghost'}
                     className="w-full justify-start"
                      onClick={() => {
                        // Usar la misma lógica que el label - calcular si no hay BD
                        let displayPrevious = previousPeriod;
                        
                        if (!displayPrevious && userCompany?.company_id && companyData) {
                          const companyConfig = {
                            default_payment_frequency: (Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency) as 'weekly' | 'biweekly' | 'monthly',
                            payment_cycle_start_day: (Array.isArray(companyData) ? companyData[0]?.payment_cycle_start_day : companyData?.payment_cycle_start_day) || 1
                          };
                          const previousCalc = calculatePreviousPeriod(companyConfig);
                          displayPrevious = {
                            id: 'calculated-previous',
                            company_id: userCompany.company_id,
                            period_start_date: previousCalc.startDate,
                            period_end_date: previousCalc.endDate,
                            period_frequency: previousCalc.frequency,
                            status: 'calculated',
                            period_type: 'regular'
                          };
                        }
                        
                        if (displayPrevious) {
                          handleOptionSelect({ 
                            type: 'previous',
                            periodId: displayPrevious.id,
                            startDate: displayPrevious.period_start_date,
                            endDate: displayPrevious.period_end_date
                          });
                        }
                      }}
                     disabled={!previousPeriod && !userCompany?.company_id}
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        {(() => {
                          // Usar la misma lógica que el label
                          let displayPrevious = previousPeriod;
                          
                          if (!displayPrevious && userCompany?.company_id && companyData) {
                            const companyConfig = {
                              default_payment_frequency: (Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency) as 'weekly' | 'biweekly' | 'monthly',
                              payment_cycle_start_day: (Array.isArray(companyData) ? companyData[0]?.payment_cycle_start_day : companyData?.payment_cycle_start_day) || 1
                            };
                            const previousCalc = calculatePreviousPeriod(companyConfig);
                            displayPrevious = {
                              id: 'calculated-previous',
                              company_id: userCompany.company_id,
                              period_start_date: previousCalc.startDate,
                              period_end_date: previousCalc.endDate,
                              period_frequency: previousCalc.frequency,
                              status: 'calculated',
                              period_type: 'regular'
                            } as any;
                          }
                          
                          if (displayPrevious) {
                            const periodLabel = formatDetailedPaymentPeriod(
                              displayPrevious.period_start_date, 
                              displayPrevious.period_end_date, 
                              Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
                            );
                            const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
                            const dateRange = formatPaymentPeriodBadge(displayPrevious.period_start_date, displayPrevious.period_end_date);
                            return `Previous: ${periodNumber} (${dateRange})`;
                          }
                          return 'Previous';
                        })()}
                    </Button>

                   <Button
                     variant={value.type === 'current' ? 'default' : 'ghost'}
                     className="w-full justify-start"
                     disabled={!currentPeriod && !calculatedPeriods?.current}
                     onClick={() => {
                       const displayPeriod = currentPeriod || calculatedPeriods?.current;
                       if (displayPeriod) {
                         // LÓGICA CONSISTENTE CON PAYMENT REPORTS
                         if (currentPeriod) {
                           // Si hay período actual en BD, usar su ID
                           handleOptionSelect({ 
                             type: 'current',
                             periodId: currentPeriod.id,
                             startDate: currentPeriod.period_start_date,
                             endDate: currentPeriod.period_end_date
                           });
                         } else {
                           // Si solo hay período calculado, usar fechas sin ID
                           handleOptionSelect({ 
                             type: 'current',
                             startDate: displayPeriod.period_start_date,
                             endDate: displayPeriod.period_end_date
                           });
                         }
                       }
                     }}
                   >
                      <Clock className="h-4 w-4 mr-2" />
                      {(() => {
                        const displayPeriod = currentPeriod || calculatedPeriods?.current;
                        if (displayPeriod) {
                          const periodLabel = formatDetailedPaymentPeriod(
                            displayPeriod.period_start_date, 
                            displayPeriod.period_end_date, 
                            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
                          );
                          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W'); // "W35/2025"
                          const dateRange = formatPaymentPeriodBadge(displayPeriod.period_start_date, displayPeriod.period_end_date);
                          return `Current: ${periodNumber} (${dateRange})`;
                        }
                        return 'Current';
                      })()}
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

                <Separator />

                {/* Períodos abiertos con scroll funcional */}
                {openPeriods.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center justify-between">
                      {t('period_filter.open_periods')}
                      <Badge variant="secondary" className="text-xs">
                        {openPeriods.length}
                      </Badge>
                    </h4>
                    
                    <div className="overflow-y-auto max-h-48 border rounded-md bg-gray-50 p-2 space-y-2">
                      {openPeriods.map((period, index) => (
                        <div
                          key={period.id}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            value.periodId === period.id 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            const detailedLabel = formatDetailedPaymentPeriod(
                              period.period_start_date, 
                              period.period_end_date, 
                              Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
                            );
                            handleOptionSelect({ 
                              type: 'specific', 
                              periodId: period.id,
                              startDate: period.period_start_date,
                              endDate: period.period_end_date,
                              label: detailedLabel
                            });
                          }}
                        >
                          <div>
                            <span className="text-sm font-medium">
                              {formatDetailedPaymentPeriod(
                                period.period_start_date, 
                                period.period_end_date, 
                                Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}