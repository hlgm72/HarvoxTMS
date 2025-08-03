import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DollarSign, Repeat, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { DeductionsManager } from "@/components/payments/DeductionsManager";
import { ExpenseTemplateDialog } from "@/components/payments/ExpenseTemplateDialog";
import { CreateEventualDeductionDialog } from "@/components/payments/CreateEventualDeductionDialog";
import { DeductionsFloatingActions } from "@/components/payments/DeductionsFloatingActions";
import { useDeductionsStats } from "@/hooks/useDeductionsStats";
import { useExpenseTypes } from "@/hooks/useExpenseTypes";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useAuth } from "@/contexts/AuthContext";

export default function Deductions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEventualDialogOpen, setIsEventualDialogOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useDeductionsStats();
  const { data: expenseTypes = [] } = useExpenseTypes();
  const { drivers = [] } = useCompanyDrivers();

  // Estado de filtros
  const [filters, setFilters] = useState({
    status: "planned",
    driver: "all",
    expenseType: "all",
    dateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined }
  });

  // Estado de configuración de vista
  const [viewConfig, setViewConfig] = useState({
    density: 'normal',
    sortBy: 'date_desc',
    groupBy: 'none',
    showDriverInfo: true,
    showAmounts: true,
    showDates: true,
    showExpenseType: true
  });

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    // Invalidar las estadísticas para que se actualicen en la cabecera
    queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
    // También invalidar las plantillas por si acaso
    queryClient.invalidateQueries({ queryKey: ['recurring-expense-templates', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['inactive-expense-templates', user?.id] });
  };

  const handleEventualSuccess = () => {
    setIsEventualDialogOpen(false);
    // Invalidar las estadísticas para que se actualicen en la cabecera
    queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
  };

  // Generar subtitle con datos reales
  const getSubtitle = () => {
    if (statsLoading || !stats) {
      return "Cargando estadísticas...";
    }

    const { activeTemplates, totalMonthlyAmount, affectedDrivers } = stats;
    
    return `${activeTemplates} plantillas activas • $${totalMonthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total mensual • ${affectedDrivers} conductores afectados`;
  };

  return (
    <>
      <PageToolbar 
        icon={DollarSign}
        title={t("deductions.title", "Gestión de Deducciones")}
        subtitle={getSubtitle()}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Repeat className="h-4 w-4" />
              Deducción Recurrente
            </Button>
            <Button variant="outline" onClick={() => setIsEventualDialogOpen(true)} className="gap-2">
              <Clock className="h-4 w-4" />
              Deducción Eventual
            </Button>
          </div>
        }
      />

      <div className="p-2 md:p-4 pr-16 md:pr-20 space-y-6">
        <DeductionsManager 
          filters={filters}
          viewConfig={viewConfig}
        />
      </div>

      <ExpenseTemplateDialog 
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
        mode="create"
      />

      <CreateEventualDeductionDialog
        isOpen={isEventualDialogOpen}
        onClose={() => setIsEventualDialogOpen(false)}
        onSuccess={handleEventualSuccess}
      />

      <DeductionsFloatingActions
        filters={filters}
        onFiltersChange={setFilters}
        onViewConfigChange={setViewConfig}
        drivers={drivers}
        expenseTypes={expenseTypes}
      />
    </>
  );
}