import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DollarSign, Repeat, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { DeductionsManager } from "@/components/payments/DeductionsManager";
import { ExpenseTemplateDialog } from "@/components/payments/ExpenseTemplateDialog";
import { EventualDeductionDialog } from "@/components/payments/EventualDeductionDialog";
import { DeductionsFloatingActions } from "@/components/payments/DeductionsFloatingActions";
import { useDeductionsStats } from "@/hooks/useDeductionsStats";
import { useExpenseTypes } from "@/hooks/useExpenseTypes";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from '@/lib/dateFormatting';

export default function Deductions() {
  const { t } = useTranslation('payments');
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
      return t("deductions.loadingStats");
    }

    const { activeTemplates, totalMonthlyAmount, affectedDrivers } = stats;
    
    return `${activeTemplates} ${t("deductions.activeTemplates")} • $${formatCurrency(totalMonthlyAmount)} ${t("deductions.monthlyTotal")} • ${affectedDrivers} ${t("deductions.affectedDrivers")}`;
  };

  return (
    <>
      <PageToolbar 
        icon={DollarSign}
        title={t("deductions.title")}
        subtitle={getSubtitle()}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 text-xs md:text-sm px-2 md:px-4">
              <Repeat className="h-4 w-4" />
              <span className="hidden sm:inline">{t("deductions.recurringDeduction")}</span>
              <span className="sm:hidden">{t("deductions.recurringShort")}</span>
            </Button>
            <Button variant="outline" onClick={() => setIsEventualDialogOpen(true)} className="gap-2 text-xs md:text-sm px-2 md:px-4">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t("deductions.eventualDeduction")}</span>
              <span className="sm:hidden">{t("deductions.eventualShort")}</span>
            </Button>
          </div>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
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

      <EventualDeductionDialog
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