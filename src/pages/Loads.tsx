import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsList } from "@/components/loads/LoadsList";
import { LoadDocumentsProvider } from "@/contexts/LoadDocumentsContext";
import { LoadsFloatingActions } from "@/components/loads/LoadsFloatingActions";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";
import { formatPaymentPeriodCompact, formatCurrency } from "@/lib/dateFormatting";
import { useLoads } from "@/hooks/useLoads";
import { useDriversList } from "@/hooks/useDriversList";
import { useCurrentPaymentPeriod } from "@/hooks/usePaymentPeriods";
import { useCalculatedPeriods } from "@/hooks/useCalculatedPeriods";
import { useCompanyCache } from "@/hooks/useCompanyCache";

export default function Loads() {
  const { t } = useTranslation('loads');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { userCompany } = useCompanyCache();
  
  // Hooks para obtener datos de períodos
  const { data: currentPeriod } = useCurrentPaymentPeriod(userCompany?.company_id);
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);
  
  // Inicializar con período actual simple (sin fechas pre-calculadas)
  const getCurrentPeriodWithDates = (): PeriodFilterValue => {
    return {
      type: 'current',
      periodId: undefined,
      startDate: undefined, 
      endDate: undefined
    };
  };
  
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(getCurrentPeriodWithDates());
  
  // ✅ CORRECCIÓN: Usar nombres consistentes driver/broker en lugar de driverId/brokerId
  const [filters, setFilters] = useState({
    search: '',
    status: "all",
    driver: "all", 
    broker: "all",
    sortBy: 'date_desc'
  });

  // ✅ INICIALIZACIÓN AUTOMÁTICA: Poblar período actual cuando esté disponible
  useEffect(() => {
    // Solo inicializar si el periodo actual aún no tiene datos
    if (periodFilter.type === 'current' && !periodFilter.periodId && !periodFilter.startDate) {
      // SIEMPRE usar período calculado para la inicialización
      const displayPeriod = calculatedPeriods?.current;
      
      if (displayPeriod) {
        // Usar solo fechas calculadas, sin ID de BD
        setPeriodFilter({
          type: 'current',
          startDate: displayPeriod.period_start_date,
          endDate: displayPeriod.period_end_date
        });
      }
    }
  }, [calculatedPeriods, periodFilter.type, periodFilter.periodId, periodFilter.startDate]);

  // ✅ OPTIMIZACIÓN: Obtener loads una sola vez y calcular stats en el cliente
  const loadsFilters = periodFilter ? {
    periodFilter: {
      type: periodFilter.type,
      periodId: periodFilter.periodId,
      startDate: periodFilter.startDate,
      endDate: periodFilter.endDate,
      selectedYear: periodFilter.selectedYear
    }
  } : undefined;
  
  const { data: loads = [], isLoading: loadsLoading } = useLoads(loadsFilters);
  
  // Hook para obtener conductores para los filtros
  const { data: drivers } = useDriversList();
  
  // ✅ OPTIMIZACIÓN: Calcular stats desde los loads ya cargados (sin query adicional)
  const loadsStats = useMemo(() => {
    const totalActive = loads.filter(l => 
      l.status !== 'completed' && l.status !== 'cancelled'
    ).length;
    
    const totalInTransit = loads.filter(l => 
      l.status === 'in_transit'
    ).length;
    
    const pendingAssignment = loads.filter(l => 
      l.status === 'created' || l.status === 'route_planned'
    ).length;
    
    const totalAmount = loads.reduce((sum, l) => sum + (l.total_amount || 0), 0);
    
    return {
      totalActive,
      totalInTransit,
      pendingAssignment,
      totalAmount
    };
  }, [loads]);

  const getPeriodDescription = () => {
    // console.log('🔍 getPeriodDescription - periodFilter:', periodFilter);
    if (!periodFilter) return t('periods.current');
    
    switch (periodFilter.type) {
      case 'current':
        return t('periods.current');
      case 'previous':
        return t('periods.previous');
      case 'next':
        return t('periods.next');
      case 'all':
        return t('periods.all');
      case 'this_month':
        return t('periods.this_month');
      case 'last_month':
        return t('periods.last_month');
      case 'this_quarter':
        return t('periods.this_quarter');
      case 'last_quarter':
        return t('periods.last_quarter');
      case 'this_year':
        return t('periods.this_year');
      case 'last_year':
        return t('periods.last_year');
      case 'year':
        return `Year: ${periodFilter.selectedYear || new Date().getFullYear()}`;
      case 'specific':
        return t('periods.specific');
      case 'custom':
        return t('periods.custom');
      default:
        return t('periods.selected');
    }
  };

  const getPeriodDateRange = () => {
    if (!periodFilter) return '';
    
    if (periodFilter.startDate && periodFilter.endDate) {
      const formatted = formatPaymentPeriodCompact(periodFilter.startDate, periodFilter.endDate);
      return formatted;
    }
    
    return '';
  };

  // ✅ OPTIMIZACIÓN: Subtitle memoizado con stats calculadas en tiempo real
  const subtitle = useMemo(() => {
    const needsCalculatedPeriods = periodFilter?.type === 'current' || periodFilter?.type === 'previous';
    
    if (loadsLoading || (needsCalculatedPeriods && !calculatedPeriods)) {
      return <div className="text-sm text-muted-foreground">{t('subtitle.loading')}</div>;
    }
    
    // Stats display
    const statsDisplay = (
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="font-medium">{loadsStats.totalActive}</span>
          <span className="text-muted-foreground">{t('subtitle.active_loads')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{formatCurrency(loadsStats.totalAmount)}</span>
          <span className="text-muted-foreground">{t('subtitle.total_value')}</span>
        </span>
        {loadsStats.totalInTransit > 0 && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-orange-600">{loadsStats.totalInTransit}</span>
            <span className="text-muted-foreground">{t('subtitle.in_transit')}</span>
          </span>
        )}
      </div>
    );
    
    // ✅ Sincronizar filtros activos con FloatingActions
    const hasActiveFilters = filters.status !== 'all' || filters.driver !== 'all' || filters.broker !== 'all';
    const periodDesc = getPeriodDescription();
    const dateRange = getPeriodDateRange();
    
    if (hasActiveFilters) {
      return (
        <div className="space-y-2">
          {statsDisplay}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('active_filters')}:</span>
            {periodDesc && dateRange && (
              <Badge variant="secondary" className="text-xs font-normal">
                {periodDesc}: {dateRange}
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('filters.status')}: {filters.status}
              </Badge>
            )}
            {filters.driver !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('filters.driver')}: {drivers?.find(d => d.value === filters.driver)?.label || filters.driver}
              </Badge>
            )}
            {filters.broker !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('filters.broker')}: {filters.broker}
              </Badge>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {statsDisplay}
        {(periodDesc || dateRange) && (
          <div className="text-xs text-muted-foreground">
            {periodDesc} {dateRange && `• ${dateRange}`}
          </div>
        )}
      </div>
    );
  }, [loadsLoading, calculatedPeriods, periodFilter, loadsStats, filters, drivers, t, getPeriodDescription, getPeriodDateRange]);
  
  // console.log('🎯 Final values:', { periodDateRange, periodDescription, periodFilter });

  return (
    <>
      <PageToolbar 
        icon={Package}
        title={t("title")}
        subtitle={subtitle}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("create.button")}
          </Button>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        <LoadDocumentsProvider>
          <LoadsList 
            filters={{
              search: filters.search,
              status: filters.status,
              driver: filters.driver,
              broker: filters.broker,
              dateRange: { from: undefined, to: undefined }
            }}
            periodFilter={periodFilter}
            onCreateLoad={() => setIsCreateDialogOpen(true)}
          />
        </LoadDocumentsProvider>

        <CreateLoadDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          mode="create"
        />
      </div>

      {/* ✅ Floating Actions con filtros sincronizados */}
      <LoadsFloatingActions
        filters={{
          status: filters.status,
          driver: filters.driver,
          broker: filters.broker,
          dateRange: { from: undefined, to: undefined }
        }}
        periodFilter={periodFilter}
        onFiltersChange={(newFilters) => {
          setFilters(prev => ({
            ...prev,
            status: newFilters.status,
            driver: newFilters.driver,
            broker: newFilters.broker
          }));
        }}
        onPeriodFilterChange={(newPeriodFilter) => {
          setPeriodFilter(newPeriodFilter);
        }}
      />
    </>
  );
}