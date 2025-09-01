import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsList } from "@/components/loads/LoadsList";
import { LoadDocumentsProvider } from "@/contexts/LoadDocumentsContext";
import { UniversalFloatingActions } from "@/components/ui/UniversalFloatingActions";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";
import { formatPaymentPeriodCompact, formatCurrency } from "@/lib/dateFormatting";
import { useLoadsStats } from "@/hooks/useLoadsStats";
import { useDriversList } from "@/hooks/useDriversList";

export default function Loads() {
  const { t } = useTranslation('loads');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Inicializar con período actual simple (sin fechas pre-calculadas)
  const getCurrentPeriodWithDates = (): PeriodFilterValue => {
    return {
      type: 'current'
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
  
  // Hook para obtener estadísticas en tiempo real
  const { data: loadsStats, isLoading: statsLoading } = useLoadsStats({ periodFilter: filters.periodFilter });
  
  // Hook para obtener conductores para los filtros
  const { data: drivers } = useDriversList();
  
  console.log('🚛 Loads - Conductores cargados:', {
    drivers,
    driversCount: drivers?.length || 0
  });

  // console.log('🎯 Loads component - periodFilter state:', periodFilter);

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
    // console.log('📅 getPeriodDateRange - periodFilter:', periodFilter);
    if (!periodFilter) return '';
    
    if (periodFilter.startDate && periodFilter.endDate) {
      // console.log('📅 Dates found:', periodFilter.startDate, periodFilter.endDate);
      const formatted = formatPaymentPeriodCompact(periodFilter.startDate, periodFilter.endDate);
      // console.log('📅 Formatted range:', formatted);
      return formatted;
    }
    
    // console.log('📅 No dates available');
    return '';
  };


  const periodDateRange = getPeriodDateRange();
  const periodDescription = getPeriodDescription();
  
  // Crear el subtitle dinámico con las estadísticas
  const getSubtitle = () => {
    // console.log('🎯 getSubtitle called - statsLoading:', statsLoading, 'loadsStats:', loadsStats);
    
    if (statsLoading || !loadsStats) {
      const loadingText = `${t('subtitle.loading')}${periodDateRange ? ` • ${periodDescription}: ${periodDateRange}` : ''}`;
      // console.log('📝 Showing loading text:', loadingText);
      return loadingText;
    }
    
    const stats = [
      `${loadsStats.totalActive} ${t('subtitle.active_loads')}`,
      `${formatCurrency(loadsStats.totalAmount)} ${t('subtitle.in_transit')}`,
      `${loadsStats.pendingAssignment} ${t('subtitle.pending_assignment')}`
    ].join(' • ');
    
    const finalSubtitle = `${stats}${periodDateRange ? ` • ${periodDescription}: ${periodDateRange}` : ''}`;
    // console.log('📝 Final subtitle:', finalSubtitle);
    // console.log('📊 Stats used:', loadsStats);
    
    return finalSubtitle;
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
        {/* Filtro de Períodos */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <PeriodFilter 
            value={periodFilter} 
            onChange={setPeriodFilter}
            isLoading={false} // TODO: Conectar con el estado real de loading
          />
        </div>

        <LoadDocumentsProvider>
          <LoadsList 
            filters={{
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
      <UniversalFloatingActions
        contextKey="loads"
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          // Sincronizar periodFilter separado para compatibilidad
          if (newFilters.periodFilter) {
            setPeriodFilter(newFilters.periodFilter);
          }
        }}
        additionalData={{
          stats: loadsStats ? {
            totalLoads: loadsStats.totalActive || 0,
            totalRevenue: loadsStats.totalAmount || 0,
            activeDrivers: loadsStats.pendingAssignment || 0
          } : undefined,
          drivers: drivers?.map(driver => ({
            user_id: driver.user_id,
            first_name: driver.label.split(' ')[0] || '',
            last_name: driver.label.split(' ').slice(1).join(' ') || ''
          })) || []
        }}
        onExportHandler={async (format) => {
          console.log(`Exportando loads como ${format}`);
          // TODO: Implementar export
        }}
      />
    </>
  );
}