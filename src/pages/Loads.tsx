import { useState } from "react";
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

export default function Loads() {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Hook para obtener estadísticas en tiempo real
  const { data: loadsStats, isLoading: statsLoading } = useLoadsStats();
  
  // Inicializar con período actual simple (sin fechas pre-calculadas)
  const getCurrentPeriodWithDates = (): PeriodFilterValue => {
    return {
      type: 'current'
    };
  };
  
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(getCurrentPeriodWithDates());
  const [filters, setFilters] = useState({
    status: "all",
    driver: "all", 
    broker: "all",
    dateRange: { from: undefined, to: undefined }
  });

  // console.log('🎯 Loads component - periodFilter state:', periodFilter);

  const getPeriodDescription = () => {
    // console.log('🔍 getPeriodDescription - periodFilter:', periodFilter);
    if (!periodFilter) return 'Período Actual';
    
    switch (periodFilter.type) {
      case 'current':
        return 'Período Actual';
      case 'previous':
        return 'Período Anterior';
      case 'next':
        return 'Período Siguiente';
      case 'all':
        return 'Histórico Completo';
      case 'this_month':
        return 'Este Mes';
      case 'last_month':
        return 'Mes Pasado';
      case 'this_quarter':
        return 'Este Trimestre';
      case 'last_quarter':
        return 'Trimestre Pasado';
      case 'this_year':
        return 'Este Año';
      case 'last_year':
        return 'Año Pasado';
      case 'specific':
        return 'Período Específico';
      case 'custom':
        return 'Rango Personalizado';
      default:
        return 'Período Seleccionado';
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
    if (statsLoading || !loadsStats) {
      return `Cargando estadísticas...${periodDateRange ? ` • ${periodDescription}: ${periodDateRange}` : ''}`;
    }
    
    const stats = [
      `${loadsStats.totalActive} cargas activas`,
      `${formatCurrency(loadsStats.totalAmount)} en tránsito`,
      `${loadsStats.pendingAssignment} pendientes asignación`
    ].join(' • ');
    
    return `${stats}${periodDateRange ? ` • ${periodDescription}: ${periodDateRange}` : ''}`;
  };
  
  // console.log('🎯 Final values:', { periodDateRange, periodDescription, periodFilter });

  return (
    <>
      <PageToolbar 
        icon={Package}
        title={t("loads.title", "Gestión de Cargas")}
        subtitle={getSubtitle()}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("loads.create.button", "Nueva Carga")}
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
            filters={filters}
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
        filters={filters}
        periodFilter={periodFilter}
        onFiltersChange={setFilters}
        onPeriodFilterChange={setPeriodFilter}
      />
    </>
  );
}