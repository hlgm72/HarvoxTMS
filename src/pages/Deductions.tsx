import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DollarSign, Repeat, Clock } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { DeductionsManager } from "@/components/payments/DeductionsManager";
import { ExpenseTemplateDialog } from "@/components/payments/ExpenseTemplateDialog";
import { EventualDeductionDialog } from "@/components/payments/EventualDeductionDialog";

import { DeductionsFloatingActions, DeductionsFiltersType } from "@/components/payments/DeductionsFloatingActions";
import { useDeductionsStats } from "@/hooks/useDeductionsStats";
import { useExpenseTypes } from "@/hooks/useExpenseTypes";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDetailedPaymentPeriod, formatPaymentPeriodBadge, formatMonthName, formatPaymentPeriodCompact } from '@/lib/dateFormatting';
import { Badge } from "@/components/ui/badge";
import { useConsolidatedDrivers } from "@/hooks/useConsolidatedDrivers";
import { useCalculatedPeriods } from "@/hooks/useCalculatedPeriods";
import { useCompanyCache } from "@/hooks/useCompanyCache";
import { useCompanyFinancialData } from "@/hooks/useSecureCompanyData";
import { useAvailableWeeks } from "@/hooks/useAvailableWeeks";
import { getISOWeek } from "date-fns";
import { PeriodFilterValue } from "@/components/loads/PeriodFilter";

export default function Deductions() {
  const { t } = useTranslation('payments');
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEventualDialogOpen, setIsEventualDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("period");
  
  // Get company data and available weeks
  const { userCompany } = useCompanyCache();
  const { data: availableWeeks } = useAvailableWeeks(userCompany?.company_id);
  
  // Initialize with current week
  const getCurrentWeek = (): PeriodFilterValue => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentWeekNumber = getISOWeek(today);
    const currentMonth = today.getMonth() + 1;
    
    // Find current week in availableWeeks
    const weekData = availableWeeks
      ?.find(w => w.year === currentYear)
      ?.months.find(m => m.month === currentMonth)
      ?.weeks.find(w => w.weekNumber === currentWeekNumber);
    
    if (weekData) {
      return {
        type: 'week',
        selectedYear: currentYear,
        selectedWeek: currentWeekNumber,
        startDate: weekData.startDate,
        endDate: weekData.endDate,
        label: `W${currentWeekNumber}/${currentYear}`
      };
    }
    
    // Fallback if no week data available
    return {
      type: 'week',
      selectedYear: currentYear,
      selectedWeek: currentWeekNumber
    };
  };
  
  // Estado de filtros
  const [filters, setFilters] = useState<DeductionsFiltersType>({
    status: "all",
    driverId: "all",
    expenseTypeId: "all",
    periodFilter: getCurrentWeek()
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

  // Get calculated periods and company data for filter labels
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);
  
  // Populate current week dates when available
  useEffect(() => {
    // Only initialize if current week doesn't have dates yet
    if (filters.periodFilter.type === 'week' && !filters.periodFilter.startDate && availableWeeks) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentWeekNumber = getISOWeek(today);
      const currentMonth = today.getMonth() + 1;
      
      // Find current week in availableWeeks
      const weekData = availableWeeks
        ?.find(w => w.year === currentYear)
        ?.months.find(m => m.month === currentMonth)
        ?.weeks.find(w => w.weekNumber === currentWeekNumber);
      
      if (weekData) {
        setFilters(prev => ({
          ...prev,
          periodFilter: {
            type: 'week',
            selectedYear: currentYear,
            selectedWeek: currentWeekNumber,
            startDate: weekData.startDate,
            endDate: weekData.endDate,
            label: `W${currentWeekNumber}/${currentYear}`
          }
        }));
      }
    }
  }, [availableWeeks, filters.periodFilter.type, filters.periodFilter.startDate]);

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

  // Get period description (similar to Load Management)
  const getPeriodDescription = () => {
    if (!filters.periodFilter) return '';
    
    const pf = filters.periodFilter;
    
    switch (pf.type) {
      case 'week':
        const weekLabel = pf.selectedWeek && pf.selectedYear 
          ? `W${pf.selectedWeek}/${pf.selectedYear}`
          : 'Week';
        return `Week: ${weekLabel}`;
      case 'month':
        const monthLabel = pf.selectedMonth && pf.selectedYear 
          ? `${formatMonthName(new Date(pf.selectedYear, pf.selectedMonth - 1))} ${pf.selectedYear}`
          : 'Month';
        return `Month: ${monthLabel}`;
      case 'quarter':
        return `Quarter: Q${pf.selectedQuarter || '?'} ${pf.selectedYear || '?'}`;
      case 'year':
        return `Year: ${pf.selectedYear || new Date().getFullYear()}`;
      case 'current':
        return t("deductions.filters.currentPeriod");
      case 'previous':
        return t("deductions.filters.previousPeriod");
      case 'all':
        return t("deductions.filters.allPeriods");
      default:
        return '';
    }
  };

  const getPeriodDateRange = () => {
    if (!filters.periodFilter) return '';
    
    if (filters.periodFilter.startDate && filters.periodFilter.endDate) {
      const formatted = formatPaymentPeriodBadge(
        filters.periodFilter.startDate, 
        filters.periodFilter.endDate
      );
      return formatted;
    }
    
    return '';
  };

  // ✅ Generar subtitle dinámico según el tab activo (similar a Load Management)
  const getSubtitle = () => {
    if (statsLoading || !stats) {
      return <div className="text-sm text-muted-foreground">{t("deductions.loadingStats")}</div>;
    }

    const { activeTemplates, totalMonthlyAmount, affectedDrivers } = stats;
    
    // Stats display (primera línea)
    let statsDisplay;
    if (activeTab === 'period') {
      statsDisplay = (
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-medium">{activeTemplates}</span>
            <span className="text-muted-foreground">{t("deductions.periodDeductions")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{formatCurrency(totalMonthlyAmount)}</span>
            <span className="text-muted-foreground">{t("deductions.totalAmount")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{affectedDrivers}</span>
            <span className="text-muted-foreground">{t("deductions.drivers")}</span>
          </span>
        </div>
      );
    } else if (activeTab === 'recurring') {
      statsDisplay = (
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-medium">{activeTemplates}</span>
            <span className="text-muted-foreground">{t("deductions.activeTemplates")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{formatCurrency(totalMonthlyAmount)}</span>
            <span className="text-muted-foreground">{t("deductions.monthlyTotal")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{affectedDrivers}</span>
            <span className="text-muted-foreground">{t("deductions.affectedDrivers")}</span>
          </span>
        </div>
      );
    } else if (activeTab === 'expense-types') {
      return <div>{t("deductions.expenseTypesSubtitle")}</div>;
    } else if (activeTab === 'history') {
      return <div>{t("deductions.historySubtitle")}</div>;
    } else {
      statsDisplay = (
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-medium">{activeTemplates}</span>
            <span className="text-muted-foreground">{t("deductions.activeTemplates")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{formatCurrency(totalMonthlyAmount)}</span>
            <span className="text-muted-foreground">{t("deductions.monthlyTotal")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">{affectedDrivers}</span>
            <span className="text-muted-foreground">{t("deductions.affectedDrivers")}</span>
          </span>
        </div>
      );
    }
    
    // Check if there are active filters
    const hasActiveFilters = filters.driverId !== 'all' || 
                            filters.status !== 'all' ||
                            filters.expenseTypeId !== 'all';
    
    const periodDesc = getPeriodDescription();
    const dateRange = getPeriodDateRange();
    
    if (hasActiveFilters) {
      return (
        <div className="space-y-2">
          {statsDisplay}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('active_filters')}:</span>
            {periodDesc && (
              <Badge variant="secondary" className="text-xs font-normal">
                {periodDesc}{dateRange && `: ${dateRange}`}
              </Badge>
            )}
            {filters.driverId !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t("deductions.filters.driver")}: {(() => {
                  const driver = drivers.find(d => d.id === filters.driverId);
                  return driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId;
                })()}
              </Badge>
            )}
            {filters.expenseTypeId !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t("deductions.filters.expenseType")}: {(() => {
                  const expenseType = expenseTypes.find(et => et.id === filters.expenseTypeId);
                  return expenseType ? expenseType.name : filters.expenseTypeId;
                })()}
              </Badge>
            )}
            {activeTab === 'period' && filters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('filters.status')}: {filters.status}
              </Badge>
            )}
          </div>
        </div>
      );
    }
    
    // No active filters - just show period info
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

      <DeductionsFloatingActions
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
        }}
        drivers={drivers}
        expenseTypes={expenseTypes}
        stats={stats ? {
          totalDeductions: stats.activeTemplates || 0,
          totalAmount: stats.totalMonthlyAmount || 0,
          pendingCount: stats.affectedDrivers || 0
        } : undefined}
      />
    </>
  );
}