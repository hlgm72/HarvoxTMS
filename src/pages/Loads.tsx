import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsList } from "@/components/loads/LoadsList";
import { LoadsFloatingActions } from "@/components/loads/LoadsFloatingActions";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Loads() {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>({ type: 'current' });
  const [filters, setFilters] = useState({
    status: "all",
    driver: "all", 
    broker: "all",
    dateRange: { from: undefined, to: undefined }
  });

  const getPeriodDescription = () => {
    if (!periodFilter) return 'Período Actual';
    
    switch (periodFilter.type) {
      case 'current':
        return 'Período Actual';
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
    if (!periodFilter) return '';
    
    if (periodFilter.startDate && periodFilter.endDate) {
      const startDate = new Date(periodFilter.startDate);
      const endDate = new Date(periodFilter.endDate);
      return `${format(startDate, 'dd/MM/yy', { locale: es })} - ${format(endDate, 'dd/MM/yy', { locale: es })}`;
    }
    
    return '';
  };

  const periodDateRange = getPeriodDateRange();
  const periodDescription = getPeriodDescription();

  return (
    <>
      <PageToolbar 
        icon={Package}
        title={t("loads.title", "Gestión de Cargas")}
        subtitle={`12 cargas activas • $45,230 en tránsito • 3 pendientes asignación${periodDateRange ? ` • ${periodDescription}: ${periodDateRange}` : ''}`}
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
          />
          <div className="text-sm text-muted-foreground animate-fade-in">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Mostrando cargas de <strong>{periodDescription}</strong>
                {periodDateRange && (
                  <>
                    <br />
                    <span className="text-xs">({periodDateRange})</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <LoadsList 
          filters={filters}
          periodFilter={periodFilter}
          onCreateLoad={() => setIsCreateDialogOpen(true)}
        />

        <CreateLoadDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
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