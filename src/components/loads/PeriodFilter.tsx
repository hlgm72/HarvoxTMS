import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, CalendarDays, ChevronDown, Clock, Loader2 } from 'lucide-react';
import { usePaymentPeriods, useCurrentPaymentPeriod, usePreviousPaymentPeriod, useNextPaymentPeriod } from '@/hooks/usePaymentPeriods';
import { useCompanyPaymentPeriods } from '@/hooks/useCompanyPaymentPeriods';
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
  
  // Importar el useCompanyCache para obtener el company_id
  const { userCompany } = useCompanyCache();
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);
  
  // Pasar el companyId a todos los hooks de períodos
  const { data: groupedPeriods = [] } = useCompanyPaymentPeriods(userCompany?.company_id);
  const allPeriods = groupedPeriods; // Usar períodos agrupados por company_payment_period_id
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
        // SIEMPRE usar período calculado para Current
        const displayCurrentPeriod = calculatedPeriods?.current;
        if (displayCurrentPeriod) {
          // ✅ NUEVO FORMATO: "Current: W35/2025 (08/25 - 08/31)"
          const periodLabel = formatDetailedPaymentPeriod(
            displayCurrentPeriod.period_start_date, 
            displayCurrentPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          // Extraer solo la parte del número de semana/mes y reemplazar "Week" con "W"
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W'); // "W35/2025" o "AGO/2025"
          const dateRange = formatPaymentPeriodBadge(displayCurrentPeriod.period_start_date, displayCurrentPeriod.period_end_date);
          return `Current: ${periodNumber} (${dateRange})`;
        } else {
          return 'Current';
        }
      case 'previous':
        // SIEMPRE usar períodos calculados para Previous para evitar datos incorrectos de BD
        let displayPreviousPeriod = calculatedPeriods?.previous;
        
        if (displayPreviousPeriod) {
          const periodLabel = formatDetailedPaymentPeriod(
            displayPreviousPeriod.period_start_date, 
            displayPreviousPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
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
        const selectedPeriod = allPeriods.find(p => p.company_payment_period_id === value.periodId);
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

  // Agrupar períodos por estado - REMOVIDO: company_payment_periods no tiene estado

  // ❌ REMOVIDO: No usar fechas calculadas, siempre usar períodos de BD
  // El período actual SIEMPRE debe venir de la base de datos

  const clearFilter = () => {
    onChange({ type: 'current' });
  };

  const handleOptionSelect = (option: PeriodFilterValue) => {
    onChange(option);
    setOpen(false);
  };

  // Hook para detectar si el período actual existe y cambiar automáticamente si fue eliminado
  useEffect(() => {
    // Solo verificar períodos reales de BD, no períodos calculados
    const isCalculatedPeriod = value.periodId?.startsWith('calculated-');
    
    if (!isCalculatedPeriod && value.type === 'specific' && value.periodId) {
      const selectedPeriod = allPeriods.find(p => p.company_payment_period_id === value.periodId);
      
      // Si el período específico ya no existe (fue eliminado), cambiar a "current"
      if (!selectedPeriod && !isLoading && allPeriods.length > 0) {
        handleOptionSelect({ type: 'current' });
      }
    } else if (!isCalculatedPeriod && value.type === 'previous' && value.periodId) {
      const selectedPeriod = allPeriods.find(p => p.company_payment_period_id === value.periodId);
      
      // Si el período anterior ya no existe (fue eliminado), cambiar a "current"
      if (!selectedPeriod && !isLoading && allPeriods.length > 0) {
        handleOptionSelect({ type: 'current' });
      }
    }
  }, [allPeriods, value.periodId, value.type, isLoading, handleOptionSelect]);

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
                     variant={value.type === 'current' ? 'default' : 'ghost'}
                     className="w-full justify-start"
                     disabled={!calculatedPeriods?.current}
                     onClick={() => {
                       // ✅ CRÍTICO: Solo pasar type, NO startDate/endDate
                       // Esto permite que PaymentReports use currentPeriod.company_payment_period_id
                       handleOptionSelect({ 
                         type: 'current'
                       });
                     }}
                   >
                      <Clock className="h-4 w-4 mr-2" />
                      {(() => {
                        const displayPeriod = calculatedPeriods?.current;
                        if (displayPeriod) {
                          const periodLabel = formatDetailedPaymentPeriod(
                            displayPeriod.period_start_date, 
                            displayPeriod.period_end_date, 
                            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
                          );
                          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
                          const dateRange = formatPaymentPeriodBadge(displayPeriod.period_start_date, displayPeriod.period_end_date);
                          return `Current: ${periodNumber} (${dateRange})`;
                        }
                        return 'Current';
                      })()}
                   </Button>

                     <Button
                     variant={value.type === 'previous' ? 'default' : 'ghost'}
                     className="w-full justify-start"
                      onClick={() => {
                        // ✅ CRÍTICO: Solo pasar type, NO startDate/endDate/periodId
                        // Esto permite que PaymentReports use previousPeriod.company_payment_period_id
                        handleOptionSelect({ 
                          type: 'previous'
                        });
                      }}
                     disabled={!calculatedPeriods?.previous}
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        {(() => {
                          // SIEMPRE usar períodos calculados para Previous
                          const displayPrevious = calculatedPeriods?.previous;
                          
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
                    variant={value.type === 'this_month' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleDateRangeSelect('this_month')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {(() => {
                      const now = new Date();
                      return `This Month (${formatMonthName(now)} ${now.getFullYear()})`;
                    })()}
                  </Button>

                  <Button
                    variant={value.type === 'this_quarter' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleDateRangeSelect('this_quarter')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {(() => {
                      const now = new Date();
                      const quarter = Math.ceil((now.getMonth() + 1) / 3);
                      return `This Quarter (Q${quarter} ${now.getFullYear()})`;
                    })()}
                  </Button>

                  <Button
                    variant={value.type === 'this_year' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleDateRangeSelect('this_year')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {(() => {
                      const now = new Date();
                      return `This Year (${now.getFullYear()})`;
                    })()}
                  </Button>

                  <Button
                    variant={value.type === 'all' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleOptionSelect({ type: 'all' })}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {t('periods.all')}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}