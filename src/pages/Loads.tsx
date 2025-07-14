import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsList } from "@/components/loads/LoadsList";
import { LoadsFloatingActions } from "@/components/loads/LoadsFloatingActions";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";

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

  return (
    <>
      <PageToolbar 
        icon={Package}
        title={t("loads.title", "Gestión de Cargas")}
        subtitle="12 cargas activas • $45,230 en tránsito • 3 pendientes asignación"
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
          <div className="text-sm text-muted-foreground">
            Mostrando cargas del {periodFilter.type === 'current' ? 'período actual' : periodFilter.type === 'all' ? 'histórico completo' : 'período seleccionado'}
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