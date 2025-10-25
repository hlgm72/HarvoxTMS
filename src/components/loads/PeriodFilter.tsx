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
import { useAvailableYears } from '@/hooks/useAvailableYears';
import { useAvailableQuarters } from '@/hooks/useAvailableQuarters';
import { useAvailableMonths } from '@/hooks/useAvailableMonths';
import { useAvailableWeeks } from '@/hooks/useAvailableWeeks';

export interface PeriodFilterValue {
  type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'month' | 'quarter' | 'week' | 'year';
  periodId?: string;
  startDate?: string;
  endDate?: string;
  label?: string;
  selectedYear?: number;
  selectedQuarter?: number;
  selectedMonth?: number;
  selectedWeek?: number;
}

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
  isLoading?: boolean;
}

export function PeriodFilter({ value, onChange, isLoading = false }: PeriodFilterProps) {
  const { t, i18n } = useTranslation(['loads', 'common']);
  const [open, setOpen] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showQuarterYearSelector, setShowQuarterYearSelector] = useState(false);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number | null>(null);
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number | null>(null);
  const [showWeekYearSelector, setShowWeekYearSelector] = useState(false);
  const [selectedWeekYear, setSelectedWeekYear] = useState<number | null>(null);
  const [selectedWeekMonth, setSelectedWeekMonth] = useState<number | null>(null);
  
  // Importar el useCompanyCache para obtener el company_id
  const { userCompany } = useCompanyCache();
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);
  const { data: availableYears = [] } = useAvailableYears(userCompany?.company_id);
  const { data: availableQuarters = [] } = useAvailableQuarters(userCompany?.company_id);
  const { data: availableMonths = [] } = useAvailableMonths(userCompany?.company_id);
  const { data: availableWeeks = [] } = useAvailableWeeks(userCompany?.company_id);
  
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
      case 'week':
        // Para filtro de semana específica
        // Si tenemos startDate/endDate guardados, usarlos
        if (value.startDate && value.endDate) {
          return {
            startDate: value.startDate,
            endDate: value.endDate,
            label: `Week ${value.selectedWeek || '?'} ${value.selectedYear || '?'}`
          };
        }
        return null;
      case 'month':
        // Para filtro de mes específico
        const monthYear = value.selectedYear || now.getFullYear();
        const targetMonth = value.selectedMonth || (now.getMonth() + 1);
        const monthStart = new Date(monthYear, targetMonth - 1, 1);
        const monthEnd = new Date(monthYear, targetMonth, 0);
        return {
          startDate: formatDateInUserTimeZone(monthStart),
          endDate: formatDateInUserTimeZone(monthEnd),
          label: `${formatMonthName(monthStart)} ${monthYear}`
        };
      case 'quarter':
        // Para filtro de trimestre específico
        const quarterYear = value.selectedYear || now.getFullYear();
        const targetQuarter = value.selectedQuarter || Math.ceil((now.getMonth() + 1) / 3);
        const quarterStart = new Date(quarterYear, (targetQuarter - 1) * 3, 1);
        const quarterEnd = new Date(quarterYear, targetQuarter * 3, 0);
        return {
          startDate: formatDateInUserTimeZone(quarterStart),
          endDate: formatDateInUserTimeZone(quarterEnd),
          label: `Q${targetQuarter} ${quarterYear}`
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
      case 'year':
        // Para filtro de año específico, usar el año seleccionado o el actual
        const yearFilterYear = value.selectedYear || now.getFullYear();
        const yearStart = new Date(yearFilterYear, 0, 1);
        const yearEnd = new Date(yearFilterYear, 11, 31);
        return {
          startDate: formatDateInUserTimeZone(yearStart),
          endDate: formatDateInUserTimeZone(yearEnd),
          label: `${yearFilterYear}`
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
      case 'week':
        const weekLabel = value.selectedWeek && value.selectedYear 
          ? `W${value.selectedWeek}/${value.selectedYear}`
          : 'Week';
        return `Week: ${weekLabel}`;
      case 'month':
        const monthLabel = value.selectedMonth && value.selectedYear 
          ? `${formatMonthName(new Date(value.selectedYear, value.selectedMonth - 1))} ${value.selectedYear}`
          : 'Month';
        return `Month: ${monthLabel}`;
      case 'quarter':
        const quarterLabel = value.selectedQuarter && value.selectedYear 
          ? `Q${value.selectedQuarter} ${value.selectedYear}`
          : 'Quarter';
        return `Quarter: ${quarterLabel}`;
      case 'year':
        const yearLabel = value.selectedYear || new Date().getFullYear();
        return `Year: ${yearLabel}`;
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
          className="justify-between w-screen max-w-sm sm:w-[21rem] bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
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
                  
                  {/* Nuevo selector de Week con sub-menú de tres niveles */}
                  <div className="relative">
                    <Button
                      variant={value.type === 'week' ? 'default' : 'ghost'}
                      className="w-full justify-between"
                      onClick={() => {
                        setShowWeekYearSelector(!showWeekYearSelector);
                        setSelectedWeekYear(null);
                        setSelectedWeekMonth(null);
                      }}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Week {value.type === 'week' && value.selectedWeek && value.selectedYear 
                          ? `(W${value.selectedWeek}/${value.selectedYear})` 
                          : ''}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showWeekYearSelector ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showWeekYearSelector && (
                      <div className="ml-6 mt-1 space-y-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md p-2 shadow-lg">
                        {!selectedWeekYear ? (
                          // Nivel 1: Selector de años
                          <>
                            <div className="text-xs text-muted-foreground px-2 py-1">Select Year:</div>
                            {availableWeeks.length > 0 ? (
                              availableWeeks.map(({ year }) => (
                                <Button
                                  key={year}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-sm"
                                  onClick={() => setSelectedWeekYear(year)}
                                >
                                  {year}
                                </Button>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground px-3 py-2">
                                No weeks available
                              </div>
                            )}
                          </>
                        ) : !selectedWeekMonth ? (
                          // Nivel 2: Selector de meses del año seleccionado
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-muted-foreground mb-1"
                              onClick={() => setSelectedWeekYear(null)}
                            >
                              ← Back to years
                            </Button>
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              Select Month ({selectedWeekYear}):
                            </div>
                            {availableWeeks
                              .find(w => w.year === selectedWeekYear)
                              ?.months.map(({ month }) => {
                                const monthDate = new Date(selectedWeekYear, month - 1, 1);
                                return (
                                  <Button
                                    key={month}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => setSelectedWeekMonth(month)}
                                  >
                                    {formatMonthName(monthDate)} {selectedWeekYear}
                                  </Button>
                                );
                              })}
                          </>
                        ) : (
                          // Nivel 3: Selector de semanas del mes seleccionado
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-muted-foreground mb-1"
                              onClick={() => setSelectedWeekMonth(null)}
                            >
                              ← Back to months
                            </Button>
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              Select Week ({formatMonthName(new Date(selectedWeekYear, selectedWeekMonth - 1))} {selectedWeekYear}):
                            </div>
                            {availableWeeks
                              .find(w => w.year === selectedWeekYear)
                              ?.months.find(m => m.month === selectedWeekMonth)
                              ?.weeks.map(({ weekNumber, startDate, endDate }) => {
                                return (
                                  <Button
                                    key={weekNumber}
                                    variant={
                                      value.selectedYear === selectedWeekYear && 
                                      value.selectedWeek === weekNumber 
                                        ? 'default' 
                                        : 'ghost'
                                    }
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => {
                                      handleOptionSelect({
                                        type: 'week',
                                        selectedYear: selectedWeekYear,
                                        selectedWeek: weekNumber,
                                        startDate,
                                        endDate,
                                        label: `W${weekNumber}/${selectedWeekYear}`
                                      });
                                      setShowWeekYearSelector(false);
                                      setSelectedWeekYear(null);
                                      setSelectedWeekMonth(null);
                                    }}
                                  >
                                    Week {weekNumber} ({formatPaymentPeriodBadge(startDate, endDate)})
                                  </Button>
                                );
                              })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nuevo selector de Month con sub-menú de dos niveles */}
                  <div className="relative">
                    <Button
                      variant={value.type === 'month' ? 'default' : 'ghost'}
                      className="w-full justify-between"
                      onClick={() => {
                        setShowMonthYearSelector(!showMonthYearSelector);
                        setSelectedMonthYear(null);
                      }}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Month {value.type === 'month' && value.selectedMonth && value.selectedYear 
                          ? `(${formatMonthName(new Date(value.selectedYear, value.selectedMonth - 1))} ${value.selectedYear})` 
                          : ''}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showMonthYearSelector ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showMonthYearSelector && (
                      <div className="ml-6 mt-1 space-y-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md p-2 shadow-lg">
                        {!selectedMonthYear ? (
                          // Nivel 1: Selector de años
                          <>
                            <div className="text-xs text-muted-foreground px-2 py-1">Select Year:</div>
                            {availableMonths.length > 0 ? (
                              availableMonths.map(({ year }) => (
                                <Button
                                  key={year}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-sm"
                                  onClick={() => setSelectedMonthYear(year)}
                                >
                                  {year}
                                </Button>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground px-3 py-2">
                                No months available
                              </div>
                            )}
                          </>
                        ) : (
                          // Nivel 2: Selector de meses del año seleccionado
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-muted-foreground mb-1"
                              onClick={() => setSelectedMonthYear(null)}
                            >
                              ← Back to years
                            </Button>
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              Select Month ({selectedMonthYear}):
                            </div>
                            {availableMonths
                              .find(m => m.year === selectedMonthYear)
                              ?.months.map(month => {
                                const monthStart = new Date(selectedMonthYear, month - 1, 1);
                                const monthEnd = new Date(selectedMonthYear, month, 0);
                                return (
                                  <Button
                                    key={month}
                                    variant={
                                      value.selectedYear === selectedMonthYear && 
                                      value.selectedMonth === month 
                                        ? 'default' 
                                        : 'ghost'
                                    }
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => {
                                      handleOptionSelect({
                                        type: 'month',
                                        selectedYear: selectedMonthYear,
                                        selectedMonth: month,
                                        startDate: formatDateInUserTimeZone(monthStart),
                                        endDate: formatDateInUserTimeZone(monthEnd),
                                        label: `${formatMonthName(monthStart)} ${selectedMonthYear}`
                                      });
                                      setShowMonthYearSelector(false);
                                      setSelectedMonthYear(null);
                                    }}
                                  >
                                    {formatMonthName(monthStart)} {selectedMonthYear}
                                  </Button>
                                );
                              })}
                          </>
                        )}
                      </div>
                      )}
                   </div>

                  {/* Nuevo selector de Quarter con sub-menú de dos niveles */}
                  <div className="relative">
                    <Button
                      variant={value.type === 'quarter' ? 'default' : 'ghost'}
                      className="w-full justify-between"
                      onClick={() => {
                        setShowQuarterYearSelector(!showQuarterYearSelector);
                        setSelectedQuarterYear(null); // Reset al abrir
                      }}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Quarter {value.type === 'quarter' && value.selectedQuarter && value.selectedYear 
                          ? `(Q${value.selectedQuarter} ${value.selectedYear})` 
                          : ''}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showQuarterYearSelector ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showQuarterYearSelector && (
                      <div className="ml-6 mt-1 space-y-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md p-2 shadow-lg">
                        {!selectedQuarterYear ? (
                          // Nivel 1: Selector de años
                          <>
                            <div className="text-xs text-muted-foreground px-2 py-1">Select Year:</div>
                            {availableQuarters.length > 0 ? (
                              availableQuarters.map(({ year }) => (
                                <Button
                                  key={year}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-sm"
                                  onClick={() => setSelectedQuarterYear(year)}
                                >
                                  {year}
                                </Button>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground px-3 py-2">
                                No quarters available
                              </div>
                            )}
                          </>
                        ) : (
                          // Nivel 2: Selector de trimestres del año seleccionado
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-muted-foreground mb-1"
                              onClick={() => setSelectedQuarterYear(null)}
                            >
                              ← Back to years
                            </Button>
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              Select Quarter ({selectedQuarterYear}):
                            </div>
                            {availableQuarters
                              .find(q => q.year === selectedQuarterYear)
                              ?.quarters.map(quarter => {
                                const quarterStart = new Date(selectedQuarterYear, (quarter - 1) * 3, 1);
                                const quarterEnd = new Date(selectedQuarterYear, quarter * 3, 0);
                                return (
                                  <Button
                                    key={quarter}
                                    variant={
                                      value.selectedYear === selectedQuarterYear && 
                                      value.selectedQuarter === quarter 
                                        ? 'default' 
                                        : 'ghost'
                                    }
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => {
                                      handleOptionSelect({
                                        type: 'quarter',
                                        selectedYear: selectedQuarterYear,
                                        selectedQuarter: quarter,
                                        startDate: formatDateInUserTimeZone(quarterStart),
                                        endDate: formatDateInUserTimeZone(quarterEnd),
                                        label: `Q${quarter} ${selectedQuarterYear}`
                                      });
                                      setShowQuarterYearSelector(false);
                                      setSelectedQuarterYear(null);
                                    }}
                                  >
                                    Q{quarter} {selectedQuarterYear}
                                  </Button>
                                );
                              })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nuevo selector de año con sub-menú */}
                  <div className="relative">
                    <Button
                      variant={value.type === 'year' ? 'default' : 'ghost'}
                      className="w-full justify-between"
                      onClick={() => setShowYearSelector(!showYearSelector)}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Year {value.type === 'year' && value.selectedYear ? `(${value.selectedYear})` : ''}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showYearSelector ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showYearSelector && (
                      <div className="ml-6 mt-1 space-y-1 max-h-48 overflow-y-auto">
                        {availableYears.length > 0 ? (
                          availableYears.map(year => (
                            <Button
                              key={year}
                              variant={value.selectedYear === year ? 'default' : 'ghost'}
                              size="sm"
                              className="w-full justify-start text-sm"
                              onClick={() => {
                                const yearStart = new Date(year, 0, 1);
                                const yearEnd = new Date(year, 11, 31);
                                handleOptionSelect({
                                  type: 'year',
                                  selectedYear: year,
                                  startDate: formatDateInUserTimeZone(yearStart),
                                  endDate: formatDateInUserTimeZone(yearEnd),
                                  label: `${year}`
                                });
                                setShowYearSelector(false);
                              }}
                            >
                              {year}
                            </Button>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground px-3 py-2">
                            No years available
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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