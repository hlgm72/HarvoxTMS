import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsList } from "@/components/loads/LoadsList";
import { LoadDocumentsProvider } from "@/contexts/LoadDocumentsContext";
import { LoadsFloatingActions } from "@/components/loads/LoadsFloatingActions";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";
import { formatPaymentPeriodCompact, formatCurrency } from "@/lib/dateFormatting";
import { useLoadsStats } from "@/hooks/useLoadsStats";
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
  
  // Adaptar filtros para el sistema universal
  const [filters, setFilters] = useState({
    search: '',
    status: "all",
    driverId: "all", 
    brokerId: "all",
    sortBy: 'date_desc',
    periodFilter: getCurrentPeriodWithDates()
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

  // ✅ SINCRONIZACIÓN CRÍTICA: Mantener ambos estados alineados
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      periodFilter: periodFilter
    }));
  }, [periodFilter]);
  
  // Hook para obtener estadísticas en tiempo real
  const { data: loadsStats, isLoading: statsLoading } = useLoadsStats({ periodFilter: filters.periodFilter });
  
  // Hook para obtener conductores para los filtros
  const { data: drivers } = useDriversList();

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

  // Generar descripción de filtros activos
  const getFilterDescription = () => {
    const parts: string[] = [];
    
    // Filtro de período con fechas
    if (periodFilter) {
      const dateRange = getPeriodDateRange();
      const description = getPeriodDescription();
      if (dateRange) {
        parts.push(`${description}: ${dateRange}`);
      } else {
        parts.push(description);
      }
    }
    
    // Filtro de conductor
    if (filters.driverId && filters.driverId !== 'all') {
      const driver = drivers?.find(d => d.user_id === filters.driverId);
      parts.push(`${t('filters.driver')}: ${driver ? driver.label : t('filters.selected')}`);
    }
    
    // Filtro de broker
    if (filters.brokerId && filters.brokerId !== 'all') {
      parts.push(`${t('filters.broker')}: ${filters.brokerId}`);
    }
    
    // Filtro de estado
    if (filters.status && filters.status !== 'all') {
      const statusLabels: Record<string, string> = {
        pending: t('filters.pending'),
        in_transit: t('filters.in_transit'),
        delivered: t('filters.delivered'),
        completed: t('filters.completed')
      };
      parts.push(`${t('filters.status')}: ${statusLabels[filters.status] || filters.status}`);
    }
    
    if (parts.length === 0) {
      return t('filters.no_filters');
    }
    
    return parts.join(' • ');
  };
  
  // Crear el subtitle dinámico con las estadísticas y filtros
  const getSubtitle = () => {
    const needsCalculatedPeriods = periodFilter?.type === 'current' || periodFilter?.type === 'previous';
    
    if (statsLoading || !loadsStats || (needsCalculatedPeriods && !calculatedPeriods)) {
      return <div>{t('subtitle.loading')}</div>;
    }
    
    // Primera línea: estadísticas
    const stats = [
      `${loadsStats.totalActive} ${t('subtitle.active_loads')}`,
      `${formatCurrency(loadsStats.totalAmount)} ${t('subtitle.in_transit')}`,
      `${loadsStats.pendingAssignment} ${t('subtitle.pending_assignment')}`
    ].join(' • ');
    
    // Segunda línea: filtros activos
    const filterDescription = getFilterDescription();
    
    return (
      <>
        <div>{stats}</div>
        <div className="text-xs text-muted-foreground/80">
          {filterDescription}
        </div>
      </>
    );
  };
  
  // console.log('🎯 Final values:', { periodDateRange, periodDescription, periodFilter });

  return (
    <>
      <PageToolbar 
        icon={Package}
        title={t("title")}
        subtitle={getSubtitle()}
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
              search: filters.search, // Pasar el filtro de búsqueda
              status: filters.status,
              driver: filters.driverId,
              broker: filters.brokerId,
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

      {/* Floating Actions */}
      <LoadsFloatingActions
        filters={{
          status: filters.status,
          driver: filters.driverId,
          broker: filters.brokerId,
          dateRange: { from: undefined, to: undefined }
        }}
        periodFilter={periodFilter}
        onFiltersChange={(newFilters) => {
          setFilters(prev => ({
            ...prev,
            status: newFilters.status,
            driverId: newFilters.driver,
            brokerId: newFilters.broker
          }));
        }}
        onPeriodFilterChange={(newPeriodFilter) => {
          setPeriodFilter(newPeriodFilter);
        }}
      />
    </>
  );
}