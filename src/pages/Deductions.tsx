import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DollarSign, Repeat, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { DeductionsManager } from "@/components/payments/DeductionsManager";
import { ExpenseTemplateDialog } from "@/components/payments/ExpenseTemplateDialog";
import { EventualDeductionDialog } from "@/components/payments/EventualDeductionDialog";

import { UniversalFloatingActions } from "@/components/ui/UniversalFloatingActions";
import { useDeductionsStats } from "@/hooks/useDeductionsStats";
import { useExpenseTypes } from "@/hooks/useExpenseTypes";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from '@/lib/dateFormatting';
import { useConsolidatedDrivers } from "@/hooks/useConsolidatedDrivers";

export default function Deductions() {
  const { t } = useTranslation('payments');
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEventualDialogOpen, setIsEventualDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("period");
  const { data: stats, isLoading: statsLoading } = useDeductionsStats();
  const { data: expenseTypes = [] } = useExpenseTypes();
  
  // Fetch company drivers using useConsolidatedDrivers
  const { drivers: consolidatedDrivers } = useConsolidatedDrivers();
  const drivers = consolidatedDrivers.map(d => ({
    id: d.user_id,
    first_name: d.first_name,
    last_name: d.last_name
  }));

  // Estado de filtros - adaptado para sistema universal
  const [filters, setFilters] = useState({
    search: '',
    status: "all",
    driverId: "all",
    expenseTypeId: "all",
    periodFilter: { type: 'current' as const }
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
    
    return `${activeTemplates} ${t("deductions.activeTemplates")} • ${formatCurrency(totalMonthlyAmount)} ${t("deductions.monthlyTotal")} • ${affectedDrivers} ${t("deductions.affectedDrivers")}`;
  };

  return (
    <>
      <PageToolbar 
        icon={DollarSign}
        title={t("deductions.title")}
        subtitle={getSubtitle()}
        actions={
          <div className="flex gap-2">
            {activeTab === "recurring" && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 text-xs md:text-sm px-2 md:px-4">
                <Repeat className="h-4 w-4" />
                <span className="hidden sm:inline">{t("deductions.newTemplate")}</span>
                <span className="sm:hidden">{t("deductions.newTemplateShort")}</span>
              </Button>
            )}
            {activeTab === "period" && (
              <Button onClick={() => setIsEventualDialogOpen(true)} className="gap-2 text-xs md:text-sm px-2 md:px-4">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">{t("deductions.newDeduction")}</span>
                <span className="sm:hidden">{t("deductions.newDeductionShort")}</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        <DeductionsManager 
          filters={{
            status: filters.status,
            driver: filters.driverId,
            expenseType: filters.expenseTypeId,
            dateRange: { from: undefined, to: undefined }, // Remove hardcoded dates
            periodFilter: filters.periodFilter
          }}
          viewConfig={viewConfig}
          onTabChange={setActiveTab}
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

      <UniversalFloatingActions
        contextKey="deductions"
        filters={filters}
        onFiltersChange={(newFilters: any) => {
          setFilters(newFilters);
        }}
        additionalData={{
          drivers: drivers.map(d => ({
            user_id: d.id,
            first_name: d.first_name,
            last_name: d.last_name
          })),
          expenseTypes: expenseTypes.map(et => ({
            id: et.id,
            name: et.name
          })),
          stats: stats ? {
            totalDeductions: stats.activeTemplates || 0,
            totalAmount: stats.totalMonthlyAmount || 0,
            pendingCount: stats.affectedDrivers || 0
          } : undefined
        }}
        onExportHandler={async (format) => {
          console.log(`Exportando deductions como ${format}`);
          // TODO: Implementar export
        }}
      />
    </>
  );
}