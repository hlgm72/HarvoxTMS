import { useState, useMemo } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";
import { UnifiedOtherIncomeForm } from "@/components/payments/UnifiedOtherIncomeForm";
import { Calculator, Plus, DollarSign, FileText, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { AdditionalPaymentsFloatingActions, AdditionalPaymentsFiltersType } from "@/components/payments/AdditionalPaymentsFloatingActions";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useConsolidatedDispatchers } from "@/hooks/useConsolidatedDispatchers";
import { useOtherIncome } from "@/hooks/useOtherIncome";
import { formatCurrency, formatPaymentPeriodBadge } from "@/lib/dateFormatting";
import { Badge } from "@/components/ui/badge";
import { getISOWeek } from "date-fns";
import { useAvailableWeeks } from "@/hooks/useAvailableWeeks";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { formatPeriodLabel } from "@/utils/periodUtils";

export default function AdditionalPayments() {
  const { isDriver, isOperationsManager, isCompanyOwner, user } = useAuth();
  const { t } = useTranslation();
  const { selectedCompany } = useUserCompanies();
  const { drivers = [] } = useCompanyDrivers();
  const { data: dispatchers = [] } = useConsolidatedDispatchers();
  const { data: availableWeeks } = useAvailableWeeks(selectedCompany?.id);
  const [isCreateIncomeDialogOpen, setIsCreateIncomeDialogOpen] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Initialize with current week
  const getCurrentWeek = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentWeekNumber = getISOWeek(today);
    const currentMonth = today.getMonth() + 1;
    
    const weekData = availableWeeks
      ?.find(w => w.year === currentYear)
      ?.months.find(m => m.month === currentMonth)
      ?.weeks.find(w => w.weekNumber === currentWeekNumber);
    
    if (weekData) {
      return {
        type: 'week' as const,
        selectedYear: currentYear,
        selectedWeek: currentWeekNumber,
        startDate: weekData.startDate,
        endDate: weekData.endDate,
        label: `W${currentWeekNumber}/${currentYear}`
      };
    }
    
    return {
      type: 'week' as const,
      selectedYear: currentYear,
      selectedWeek: currentWeekNumber
    };
  };

  const [filters, setFilters] = useState<AdditionalPaymentsFiltersType>({
    userId: 'all',
    status: 'all',
    userType: 'all',
    periodFilter: getCurrentWeek()
  });

  // Fetch data with filters
  const { data: incomeData = [] } = useOtherIncome({
    driverId: filters.userId !== 'all' ? filters.userId : undefined,
    status: filters.status !== 'all' ? filters.status : undefined
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = incomeData.length;
    const totalAmount = incomeData.reduce((sum, item) => sum + item.amount, 0);
    const totalApproved = incomeData
      .filter(item => item.status === 'approved')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalPending = incomeData
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      totalItems,
      totalAmount,
      totalApproved,
      totalPending
    };
  }, [incomeData]);

  const handleAddIncome = () => {
    setIsCreateIncomeDialogOpen(true);
  };

  // Format period display
  const getPeriodDescription = () => {
    if (!filters.periodFilter?.startDate || !filters.periodFilter?.endDate) {
      return filters.periodFilter?.label || 'Current Week';
    }
    return formatPeriodLabel(filters.periodFilter.startDate, filters.periodFilter.endDate);
  };

  // Format active filters
  const getActiveFiltersText = () => {
    const activeFilters: string[] = [];
    
    if (filters.userType !== 'all') {
      const typeLabel = filters.userType === 'driver' ? t('additional_payments.filters.drivers_only') : t('additional_payments.filters.dispatchers_only');
      activeFilters.push(typeLabel);
    }
    
    if (filters.userId !== 'all') {
      const allUsers = [...drivers, ...dispatchers];
      const user = allUsers.find(u => (u.user_id || u.id) === filters.userId);
      if (user) {
        activeFilters.push(`${user.first_name} ${user.last_name}`);
      }
    }
    
    if (filters.status !== 'all') {
      activeFilters.push(t(`filters.status_options.${filters.status}`));
    }
    
    return activeFilters.length > 0 ? activeFilters.join(' • ') : null;
  };

  const activeFiltersText = getActiveFiltersText();

  return (
    <>
      <PageToolbar 
        icon={Calculator}
        title={t('additional_payments.title')}
        subtitle={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {stats.totalItems} {t('additional_payments.items', 'items')} • {formatCurrency(stats.totalAmount)}
            </span>
            <span className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {getPeriodDescription()}
              </Badge>
            </span>
            {activeFiltersText && (
              <span className="text-muted-foreground">
                • {activeFiltersText}
              </span>
            )}
          </div>
        }
        actions={
          <div className="hidden md:flex gap-2">
            <Button onClick={handleAddIncome} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('additional_payments.actions.add_income')}
            </Button>
          </div>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        {/* Sección unificada de ingresos adicionales */}
        <OtherIncomeSection hideAddButton={true} />
      </div>

      {/* Floating Actions Button */}
      <AdditionalPaymentsFloatingActions
        filters={filters}
        onFiltersChange={setFilters}
        onAddIncome={handleAddIncome}
        drivers={drivers}
        dispatchers={dispatchers}
        stats={stats}
      />

      {/* Dialog para crear ingreso */}
      <Dialog open={isCreateIncomeDialogOpen} onOpenChange={setIsCreateIncomeDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{t('additional_payments.dialogs.new_income_title')}</DialogTitle>
            <DialogDescription>
              {t('additional_payments.dialogs.new_income_description')}
            </DialogDescription>
          </div>
          <div className="overflow-y-auto flex-1 p-6 bg-white">
            <UnifiedOtherIncomeForm 
              onClose={() => setIsCreateIncomeDialogOpen(false)}
              showButtons={false}
              onValidationChange={setIsFormValid}
            />
          </div>
          <div className="flex gap-2 p-4 border-t flex-shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={() => setIsCreateIncomeDialogOpen(false)} className="flex-1">
              {t('common:form.cancel')}
            </Button>
            <Button 
              type="submit"
              form="other-income-form"
              className="flex-1"
              disabled={!isFormValid}
            >
              {t('common:form.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    
    </>
  );
}