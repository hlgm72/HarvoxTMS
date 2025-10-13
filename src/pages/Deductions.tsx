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
  
  // Estado de filtros - adaptado para sistema universal
  const [filters, setFilters] = useState({
    search: '',
    status: "all",
    driverId: "all",
    expenseTypeId: "all",
    periodFilter: { type: 'current' as const }
  });

  // ✅ Pasar tab activo y filtros al hook de estadísticas
  const { data: stats, isLoading: statsLoading } = useDeductionsStats({
    activeTab,
    driverId: filters.driverId,
    expenseTypeId: filters.expenseTypeId,
    periodFilter: filters.periodFilter
  });
  
  const { data: expenseTypes = [] } = useExpenseTypes();
  
  // Fetch company drivers using useConsolidatedDrivers
  const { drivers: consolidatedDrivers } = useConsolidatedDrivers();
  const drivers = consolidatedDrivers.map(d => ({
    id: d.user_id,
    first_name: d.first_name,
    last_name: d.last_name
  }));

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

  // ✅ Generar descripción de filtros activos
  const getFilterDescription = () => {
    const parts: string[] = [];
    
    // Filtro de período
    if (filters.periodFilter) {
      const pf = filters.periodFilter as any;
      
      // Si hay un label, usarlo directamente (para this_month, this_quarter, this_year, etc.)
      if (pf.label) {
        parts.push(pf.label);
      } else if (pf.type === 'current') {
        parts.push(t("deductions.filters.currentPeriod"));
      } else if (pf.type === 'previous') {
        parts.push(t("deductions.filters.previousPeriod"));
      } else if (pf.type === 'specific' && pf.periodId) {
        parts.push(t("deductions.filters.specificPeriod"));
      } else if (pf.type === 'all') {
        parts.push(t("deductions.filters.allPeriods"));
      }
    }
    
    // Filtro de conductor
    if (filters.driverId && filters.driverId !== 'all') {
      const driver = drivers.find(d => d.id === filters.driverId);
      if (driver) {
        parts.push(`${t("deductions.filters.driver")}: ${driver.first_name} ${driver.last_name}`);
      }
    }
    
    // Filtro de tipo de gasto
    if (filters.expenseTypeId && filters.expenseTypeId !== 'all') {
      const expenseType = expenseTypes.find(et => et.id === filters.expenseTypeId);
      if (expenseType) {
        parts.push(`${t("deductions.filters.expenseType")}: ${expenseType.name}`);
      }
    }
    
    // Filtro de estado (solo para period tab)
    if (activeTab === 'period' && filters.status && filters.status !== 'all') {
      const statusLabels: Record<string, string> = {
        planned: t("deductions.status_labels.planned"),
        applied: t("deductions.status_labels.applied"),
        deferred: t("deductions.status_labels.deferred")
      };
      parts.push(`${t("deductions.filters.status")}: ${statusLabels[filters.status] || filters.status}`);
    }
    
    if (parts.length === 0) {
      return t("deductions.filters.noFilters");
    }
    
    return parts.join(' • ');
  };

  // ✅ Generar subtitle dinámico según el tab activo
  const getSubtitle = () => {
    if (statsLoading || !stats) {
      return <div>{t("deductions.loadingStats")}</div>;
    }

    const { activeTemplates, totalMonthlyAmount, affectedDrivers } = stats;
    
    // Primera línea: estadísticas según el tab activo
    let statsLine = '';
    if (activeTab === 'period') {
      statsLine = `${activeTemplates} ${t("deductions.periodDeductions")} • ${formatCurrency(totalMonthlyAmount)} ${t("deductions.totalAmount")} • ${affectedDrivers} ${t("deductions.drivers")}`;
    } else if (activeTab === 'recurring') {
      statsLine = `${activeTemplates} ${t("deductions.activeTemplates")} • ${formatCurrency(totalMonthlyAmount)} ${t("deductions.monthlyTotal")} • ${affectedDrivers} ${t("deductions.affectedDrivers")}`;
    } else if (activeTab === 'expense-types') {
      return <div>{t("deductions.expenseTypesSubtitle")}</div>;
    } else if (activeTab === 'history') {
      return <div>{t("deductions.historySubtitle")}</div>;
    } else {
      statsLine = `${activeTemplates} ${t("deductions.activeTemplates")} • ${formatCurrency(totalMonthlyAmount)} ${t("deductions.monthlyTotal")} • ${affectedDrivers} ${t("deductions.affectedDrivers")}`;
    }
    
    // Segunda línea: filtros activos
    const filterDescription = getFilterDescription();
    
    return (
      <>
        <div>{statsLine}</div>
        <div className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
          <span className="font-medium">{t("deductions.filters.activeFilters")}:</span>
          <span>{filterDescription}</span>
        </div>
      </>
    );
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