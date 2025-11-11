import { useState, useMemo, useEffect, useCallback } from "react";
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
import { formatCurrency, formatPaymentPeriodBadge, formatMonthName } from "@/lib/dateFormatting";
import { Badge } from "@/components/ui/badge";
import { getISOWeek } from "date-fns";
import { useAvailableWeeks } from "@/hooks/useAvailableWeeks";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCalculatedPeriods } from "@/hooks/useCalculatedPeriods";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPeriodLabel } from "@/utils/periodUtils";
import { formatDateOnly, formatDateInUserTimeZone } from "@/lib/dateFormatting";

export default function AdditionalPayments() {
  const { isDriver, isOperationsManager, isCompanyOwner, user } = useAuth();
  const { t } = useTranslation();
  const { selectedCompany } = useUserCompanies();
  const { drivers = [] } = useCompanyDrivers();
  const { data: dispatchers = [] } = useConsolidatedDispatchers();
  const { data: availableWeeks } = useAvailableWeeks(selectedCompany?.id);
  const { data: calculatedPeriods } = useCalculatedPeriods(selectedCompany?.id);
  const [isCreateIncomeDialogOpen, setIsCreateIncomeDialogOpen] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [createFormState, setCreateFormState] = useState<{
    selectedUser: string;
    date: Date | undefined;
  }>({ selectedUser: '', date: undefined });

  // Callback estable para actualizar el estado del formulario
  const handleFormStateChange = useCallback((state: { selectedUser: string; date: Date | undefined }) => {
    setCreateFormState(state);
  }, []);

  // Query para verificar períodos pagados
  const { data: paymentPeriods = [], isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['user-payment-periods-additional-payments', createFormState.selectedUser, createFormState.date?.toISOString()],
    queryFn: async () => {
      if (!createFormState.selectedUser || !createFormState.date || !selectedCompany?.id) {
        return [];
      }

      const incomeDateStr = formatDateInUserTimeZone(createFormState.date);
      
      const { data: allPeriods, error } = await supabase
        .from('user_payrolls')
        .select(`
          *,
          period:company_payment_periods!company_payment_period_id(
            period_start_date,
            period_end_date,
            period_frequency
          )
        `)
        .eq('company_id', selectedCompany.id)
        .eq('user_id', createFormState.selectedUser)
        .order('created_at', { ascending: false });
      
      if (error) return [];

      const periodsForDate = allPeriods?.filter(period => {
        if (!period.period) return false;
        return incomeDateStr >= period.period.period_start_date && 
               incomeDateStr <= period.period.period_end_date;
      }) || [];

      return periodsForDate.filter(p => p.payment_status === 'paid');
    },
    enabled: !!createFormState.selectedUser && !!createFormState.date && !!selectedCompany?.id && isCreateIncomeDialogOpen
  });

  const isPeriodPaid = paymentPeriods.length > 0;

  // Estado de filtros - inicializar con tipo 'week'
  const [filters, setFilters] = useState<AdditionalPaymentsFiltersType>({
    userId: 'all',
    status: 'all',
    userType: 'all',
    periodFilter: {
      type: 'week'
    }
  });

  // ✅ INICIALIZACIÓN AUTOMÁTICA: Establecer semana actual cuando availableWeeks esté disponible
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // Solo inicializar si aún no se ha hecho
    if (hasInitialized) return;
    if (!availableWeeks) return; // Esperar datos de availableWeeks
    
    setHasInitialized(true);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentWeekNumber = getISOWeek(today);
    const currentMonth = today.getMonth() + 1;
    
    // Buscar la semana actual en availableWeeks
    const weekData = availableWeeks
      .find(w => w.year === currentYear)
      ?.months.find(m => m.month === currentMonth)
      ?.weeks.find(w => w.weekNumber === currentWeekNumber);
    
    if (weekData) {
      // ✅ CORRECCIÓN: Usar fechas de availableWeeks
      setFilters(prev => ({
        ...prev,
        periodFilter: {
          type: 'week',
          selectedYear: currentYear,
          selectedWeek: currentWeekNumber,
          startDate: weekData.startDate,
          endDate: weekData.endDate,
          periodId: weekData.periodId,
          label: `W${currentWeekNumber}/${currentYear}`
        }
      }));
    } else {
      // Si no se encuentra la semana actual, usar la semana más reciente disponible
      const mostRecentYear = availableWeeks[0];
      const mostRecentMonth = mostRecentYear?.months[0];
      const mostRecentWeek = mostRecentMonth?.weeks[0];
      
      if (mostRecentWeek) {
        setFilters(prev => ({
          ...prev,
          periodFilter: {
            type: 'week',
            selectedYear: mostRecentYear.year,
            selectedWeek: mostRecentWeek.weekNumber,
            startDate: mostRecentWeek.startDate,
            endDate: mostRecentWeek.endDate,
            periodId: mostRecentWeek.periodId,
            label: `W${mostRecentWeek.weekNumber}/${mostRecentYear.year}`
          }
        }));
      }
    }
  }, [availableWeeks, hasInitialized]);

  // Fetch data with filters
  const { data: incomeData = [] } = useOtherIncome({
    driverId: filters.userId !== 'all' ? filters.userId : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    startDate: filters.periodFilter.startDate,
    endDate: filters.periodFilter.endDate,
    userRole: filters.userType !== 'all' ? filters.userType : undefined
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

  // Get period description (similar to Load Management)
  const getPeriodDescription = () => {
    if (!filters.periodFilter) return '';
    
    const pf = filters.periodFilter;
    
    // Si tiene label personalizado, usarlo directamente
    if (pf.label) {
      return `Week: ${pf.label}`;
    }
    
    return '';
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

  // Generate subtitle dynamically (similar to Deductions Management)
  const getSubtitle = () => {
    // Stats display (first line)
    const statsDisplay = (
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1">
          <span className="font-medium">{stats.totalItems}</span>
          <span className="text-muted-foreground">{t('payments:additional_payments.items')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{formatCurrency(stats.totalAmount)}</span>
          <span className="text-muted-foreground">{t('payments:additional_payments.stats.total_amount')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{formatCurrency(stats.totalApproved)}</span>
          <span className="text-muted-foreground">{t('payments:additional_payments.stats.approved')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{formatCurrency(stats.totalPending)}</span>
          <span className="text-muted-foreground">{t('payments:additional_payments.stats.pending')}</span>
        </span>
      </div>
    );
    
    // Check if there are active filters
    const hasActiveFilters = filters.userId !== 'all' || 
                            filters.status !== 'all' ||
                            filters.userType !== 'all';
    
    const periodDesc = getPeriodDescription();
    const dateRange = getPeriodDateRange();
    
    if (hasActiveFilters) {
      return (
        <div className="space-y-2">
          {statsDisplay}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('filters.active_filters', 'Active Filters')}:</span>
            {periodDesc && (
              <Badge variant="secondary" className="text-xs font-normal">
                {periodDesc}{dateRange && `: ${dateRange}`}
              </Badge>
            )}
            {filters.userType !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('payments:additional_payments.filters.user_type')}: {filters.userType === 'driver' ? t('payments:additional_payments.filters.drivers_only') : t('payments:additional_payments.filters.dispatchers_only')}
              </Badge>
            )}
            {filters.userId !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('filters.active_badges.user')}: {(() => {
                  const allUsers = [...drivers, ...dispatchers];
                  const user = allUsers.find(u => (u.user_id || u.id) === filters.userId);
                  if (!user) return filters.userId;
                  const fullName = 'full_name' in user ? user.full_name : undefined;
                  return fullName || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                })() as string}
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('filters.status')}: {t(`filters.status_options.${filters.status}`)}
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
        icon={Calculator}
        title={t('payments:additional_payments.title')}
        subtitle={getSubtitle()}
        actions={
          <div className="hidden md:flex gap-2">
            <Button onClick={handleAddIncome} className="gap-2 text-xs md:text-sm px-2 md:px-4">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('payments:additional_payments.actions.add_income')}</span>
              <span className="sm:hidden">{t('payments:additional_payments.actions.add_income_short')}</span>
            </Button>
          </div>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        {/* Sección unificada de ingresos adicionales */}
        <OtherIncomeSection 
          hideAddButton={true} 
          filteredData={incomeData}
          isLoading={false}
        />
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
            <DialogTitle>{t('payments:additional_payments.dialogs.new_income_title')}</DialogTitle>
            <DialogDescription>
              {t('payments:additional_payments.dialogs.new_income_description')}
            </DialogDescription>

            {/* ⭐ ADVERTENCIA DE VERIFICACIÓN DE PERÍODO */}
            {createFormState.selectedUser && createFormState.date && isLoadingPeriods && (
              <div className="mt-4 p-3 border border-blue-200 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  {t('payments:form.checking_period')}
                </p>
              </div>
            )}
            
            {/* ⭐ ADVERTENCIA DE PERÍODO PAGADO */}
            {createFormState.selectedUser && createFormState.date && !isLoadingPeriods && isPeriodPaid && paymentPeriods[0]?.period && (
              <div className="mt-4 p-3 border border-red-200 bg-red-50 rounded-md">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ {t('payments:form.payroll_paid_title')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {(() => {
                    const period = paymentPeriods[0].period;
                    const startDate = formatDateOnly(period.period_start_date);
                    const endDate = formatDateOnly(period.period_end_date);
                    const periodLabel = formatPeriodLabel(period.period_start_date, period.period_end_date);
                    
                    return t('payments:form.payroll_paid_message', {
                      periodLabel,
                      startDate,
                      endDate
                    });
                  })()}
                </p>
              </div>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-6 bg-white">
            <UnifiedOtherIncomeForm 
              onClose={() => setIsCreateIncomeDialogOpen(false)}
              showButtons={false}
              onValidationChange={setIsFormValid}
              onFormStateChange={handleFormStateChange}
              isPeriodPaid={isPeriodPaid}
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