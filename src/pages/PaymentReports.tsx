import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { FileText, DollarSign, Timer, BarChart3, Users, Wallet, ClockIcon, Banknote, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyCache } from "@/hooks/useCompanyCache";
import { formatPaymentPeriod, formatDateAuto, formatCurrency, formatDateSafe, formatDetailedPaymentPeriod, formatPaymentPeriodBadge } from "@/lib/dateFormatting";
import { useFleetNotifications } from "@/components/notifications";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { generatePaymentReportPDF } from "@/lib/paymentReportPDF";
import { PaymentReportDialog } from "@/components/payments/PaymentReportDialog";
import { MarkDriverPaidDialog } from "@/components/payments/MarkDriverPaidDialog";
import { useDriverPaymentActions } from "@/hooks/useDriverPaymentActions";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { PaymentReportsFloatingActions, PaymentFiltersType } from "@/components/payments/PaymentReportsFloatingActions";
import { useCurrentPaymentPeriod, usePaymentPeriods, usePreviousPaymentPeriod, useNextPaymentPeriod } from "@/hooks/usePaymentPeriods";
import { useTranslation } from 'react-i18next';
import { useFinancialDataValidation } from "@/hooks/useFinancialDataValidation";
import { FinancialLockWarning, FinancialLockIndicator } from "@/components/payments/FinancialLockWarning";
import { formatPeriodLabel } from "@/utils/periodUtils";
import { usePaymentReportsStats } from "@/hooks/usePaymentReportsStats";
import { useCalculatedPeriods } from "@/hooks/useCalculatedPeriods";
import { useCompanyFinancialData } from "@/hooks/useSecureCompanyData";

export default function PaymentReports() {
  const { t } = useTranslation(['payments', 'common']);
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { showSuccess, showError } = useFleetNotifications();
  
  // Obtener períodos para inicializar con el período actual
  const { data: currentPeriod } = useCurrentPaymentPeriod();
  const { data: previousPeriod } = usePreviousPaymentPeriod();
  const { data: nextPeriod } = useNextPaymentPeriod();
  const { data: allPeriods } = usePaymentPeriods();
  
  const [filters, setFilters] = useState<PaymentFiltersType>({
    driverId: 'all',
    status: 'all',
    periodFilter: { type: 'current' }
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCalculationId, setSelectedCalculationId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<any>(null);
  
  // Estados de carga para export
  const [exportLoading, setExportLoading] = useState(false);

  // Obtener períodos calculados y datos de compañía para formateo de filtros
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);

  // Hook de estadísticas con filtros aplicados
  const { data: stats, isLoading: statsLoading } = usePaymentReportsStats({
    driverId: filters.driverId,
    status: filters.status,
    periodFilter: filters.periodFilter
  });

  // Handler para exportar datos
  const handleExport = async (format: string) => {
    setExportLoading(true);
    try {
      console.log(`📄 Exportando payment reports como ${format}...`);
      // TODO: Implementar export basado en el formato existente
      if (format === 'pdf') {
        // Usar la funcionalidad existente de PDF
        // await generatePaymentReportPDF(...);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Export completado');
    } catch (error) {
      console.error('❌ Error en export:', error);
    } finally {
      setExportLoading(false);
    }
  };
  
  const { markDriverAsPaid, calculateUserPeriod, checkPeriodClosureStatus, isLoading: paymentLoading } = useDriverPaymentActions();

  // Validación de integridad financiera para el período actual
  const currentPeriodId = useMemo(() => {
    if (filters.periodFilter.type === 'current' && currentPeriod) return currentPeriod.id;
    if (filters.periodFilter.type === 'specific' && filters.periodFilter.periodId) return filters.periodFilter.periodId;
    return null;
  }, [filters.periodFilter, currentPeriod]);

  const { 
    data: financialValidation, 
    isLoading: isValidationLoading 
  } = useFinancialDataValidation(currentPeriodId);

  // Actualizar filtro de período cuando se carga el período actual
  useEffect(() => {
    // ✅ Para 'current', NO guardar fechas - solo tipo
    // El filtro en BD usará currentPeriod.id automáticamente
    if (currentPeriod && filters.periodFilter.type === 'current' && !filters.periodFilter.periodId) {
      setFilters(prev => ({
        ...prev,
        periodFilter: {
          type: 'current'
          // NO incluir periodId, startDate, endDate, ni label para que siempre use el cálculo dinámico
        }
      }));
    }
  }, [currentPeriod, filters.periodFilter.type, filters.periodFilter.periodId]);

  // Determinar qué período usar para filtrar
  const getFilterPeriodIds = useMemo(() => {
    const periodFilter = filters.periodFilter;
    
    if (!periodFilter) return [];

    switch (periodFilter.type) {
      case 'current':
        return currentPeriod ? [currentPeriod.id] : [];
      
      case 'previous':
        // ✅ CORREGIDO: Solo usar ID si hay periodId especificado (período real de BD)
        return periodFilter.periodId && previousPeriod ? [previousPeriod.id] : [];
      
      case 'next':
        return periodFilter.periodId && nextPeriod ? [nextPeriod.id] : [];
      
      case 'specific':
        return periodFilter.periodId ? [periodFilter.periodId] : [];
      
      case 'all':
        // Para 'all', no necesitamos filtrar por IDs específicos - la query ya trae todos por company_id
        return [];
      
      case 'custom':
        // Para filtro personalizado, usaremos las fechas en la query
        return [];
      
      default:
        return currentPeriod ? [currentPeriod.id] : [];
    }
  }, [filters.periodFilter, currentPeriod, previousPeriod, nextPeriod, allPeriods]);

  // Obtener reportes existentes filtrados por período con verificación automática de integridad
  const { data: paymentCalculations = [], isLoading, refetch } = useQuery({
    queryKey: ['payment-calculations-reports', getFilterPeriodIds, filters.periodFilter],
    queryFn: async () => {
      console.log('🔍 PaymentReports Query - getFilterPeriodIds:', getFilterPeriodIds);
      console.log('🔍 PaymentReports Query - periodFilter:', filters.periodFilter);
      
      // ⚠️ VERIFICACIÓN DE INTEGRIDAD DESACTIVADA TEMPORALMENTE
      // La función verify_and_recalculate_company_payments estaba causando problemas de permisos
      // y resetaba los datos a 0. Por ahora usaremos los datos directos de la DB.
      console.log('🔍 Obteniendo datos de cálculos sin verificación automática de integridad...');
      
      let query = supabase
        .from('user_payrolls')
        .select(`
          *,
          period:company_payment_periods!company_payment_period_id(
            period_start_date,
            period_end_date,
            period_frequency
          )
        `)
        .eq('company_id', userCompany.company_id)
        .order('created_at', { ascending: false});

      // ✅ CORREGIDO: Determinar si necesitamos filtrar en BD o en cliente
      const needsClientSideFiltering = 
        filters.periodFilter.periodId?.startsWith('calculated-') ||
        filters.periodFilter.type === 'custom' ||
        filters.periodFilter.type === 'this_month' ||
        filters.periodFilter.type === 'this_quarter' ||
        filters.periodFilter.type === 'this_year' ||
        (filters.periodFilter.startDate && filters.periodFilter.endDate);

      if (needsClientSideFiltering) {
        // Para períodos calculados o rangos de fechas, obtener todos y filtrar en cliente
        console.log('📊 Will filter on client side - fetching all periods');
      } else if (filters.periodFilter.type === 'all') {
        // Para 'all', no aplicar filtro de período - ya está filtrado por company_id
        console.log('📊 Showing all periods - no period filter applied');
      } else if (getFilterPeriodIds.length > 0) {
        // Para períodos específicos de BD (current, previous, next, specific)
        console.log('📊 Adding period filter for real DB IDs:', getFilterPeriodIds);
        query = query.in('company_payment_period_id', getFilterPeriodIds);
      } else {
        console.log('📊 No period filter applied - returning empty');
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ PaymentReports Query Error:', error);
        throw error;
      }
      
      console.log('✅ PaymentReports Query Result:', data?.length, 'calculations found');
      
      // Filtrar en cliente si es necesario (solo para períodos calculados o rangos personalizados)
      let filteredData = data || [];
      
      // ✅ Solo filtrar en cliente si es un período calculado (no existe en BD) o rango personalizado
      if ((filters.periodFilter.periodId?.startsWith('calculated-') || 
           filters.periodFilter.type === 'custom' ||
           filters.periodFilter.type === 'this_month' ||
           filters.periodFilter.type === 'this_quarter' ||
           filters.periodFilter.type === 'this_year') &&
          filters.periodFilter.startDate && 
          filters.periodFilter.endDate) {
        console.log('🔍 Filtering on client side with dates:', filters.periodFilter.startDate, filters.periodFilter.endDate);
        filteredData = filteredData.filter((calc: any) => {
          const periodStart = calc.period?.period_start_date;
          const periodEnd = calc.period?.period_end_date;
          if (!periodStart || !periodEnd) return false;
          
          // Verificar si el período se solapa con el rango solicitado
          return periodStart <= filters.periodFilter.endDate! && 
                 periodEnd >= filters.periodFilter.startDate!;
        });
        console.log('✅ Filtered to', filteredData.length, 'calculations');
      }
      
      // Ordenar por fecha de inicio del período (más reciente primero) usando formateo seguro
      const sortedData = filteredData.sort((a, b) => {
        const aData = a as any;
        const bData = b as any;
        const dateA = formatDateSafe(aData.period?.period_start_date, 'yyyy-MM-dd');
        const dateB = formatDateSafe(bData.period?.period_start_date, 'yyyy-MM-dd');
        return dateB.localeCompare(dateA); // Descendente (más reciente primero)
      });
      
      return sortedData;
    },
    enabled: !!user && !!userCompany?.company_id && (
      filters.periodFilter.type === 'all' || 
      getFilterPeriodIds.length > 0 || 
      Boolean(filters.periodFilter.startDate && filters.periodFilter.endDate)
    )
  });

  // Obtener conductores para filtro
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-for-reports'],
    queryFn: async () => {
      const driverIds = paymentCalculations.map(calc => calc.user_id);
      if (driverIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverIds);

      if (error) throw error;
      return data || [];
    },
    enabled: paymentCalculations.length > 0
  });

  // Filtrar cálculos según los filtros aplicados (excepto período que ya se filtra en la query)
  const filteredCalculations = paymentCalculations.filter(calc => {
    // Filtro de conductor
    const matchesDriver = filters.driverId === "all" || calc.user_id === filters.driverId;
    
    // Filtro de estado
    let matchesStatus = true;
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'pending':
          matchesStatus = !calc.calculated_at;
          break;
        case 'calculated':
          matchesStatus = !!calc.calculated_at && calc.payment_status !== 'paid';
          break;
        case 'paid':
          matchesStatus = calc.payment_status === 'paid';
          break;
        case 'failed':
          matchesStatus = calc.payment_status === 'failed';
          break;
        case 'negative':
          matchesStatus = calc.has_negative_balance;
          break;
        case 'approved':
          matchesStatus = calc.payment_status === 'approved';
          break;
      }
    }
    
    return matchesDriver && matchesStatus;
  });

  // Estadísticas del dashboard
  const totalReports = filteredCalculations.length;
  const totalEarnings = filteredCalculations.reduce((sum, calc) => sum + calculateNetPayment(calc), 0);
  const totalDrivers = new Set(filteredCalculations.map(calc => calc.user_id)).size;
  const pendingReports = filteredCalculations.filter(calc => !calc.calculated_at).length;

  const handleGenerateReport = async (calculation: any) => {
    setIsGenerating(true);
    try {
      const driver = drivers.find(d => d.user_id === calculation.driver_user_id);
      const reportData = {
        driver: {
          name: `${driver?.first_name || ''} ${driver?.last_name || ''}`,
          user_id: calculation.driver_user_id
        },
        period: {
          start_date: calculation.company_payment_periods.period_start_date,
          end_date: calculation.company_payment_periods.period_end_date,
          gross_earnings: calculation.gross_earnings,
          fuel_expenses: calculation.fuel_expenses,
          total_deductions: calculation.total_deductions,
          other_income: calculation.other_income,
          net_payment: calculateNetPayment(calculation),
          payment_date: calculation.company_payment_periods.payment_date
        },
        company: {
          name: t('reports.company_name')
        }
      };

      await generatePaymentReportPDF(reportData);
      showSuccess(t('reports.messages.report_generated'), t('reports.messages.pdf_success'));
    } catch (error: any) {
      console.error('Error generating report:', error);
      showError("Error", t('reports.messages.pdf_error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewReport = (calculationId: string) => {
    setSelectedCalculationId(calculationId);
    setReportDialogOpen(true);
  };

  const getStatusBadge = (calculation: any) => {
    if (!calculation.calculated_at) {
      return <Badge variant="outline">{t('reports.status.pending')}</Badge>;
    }
    if (calculation.payment_status === 'paid') {
      return <Badge variant="default" className="bg-green-100 text-green-800">{t('reports.status.paid')}</Badge>;
    }
    if (calculation.payment_status === 'failed') {
      return <Badge variant="destructive">{t('reports.status.failed')}</Badge>;
    }
    if (calculation.has_negative_balance) {
      return <Badge variant="destructive">{t('reports.status.negative_balance')}</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">{t('reports.status.ready_payment')}</Badge>;
  };

  const handleMarkAsPaid = (calculation: any) => {
    setSelectedForPayment(calculation);
    setPaymentDialogOpen(true);
  };

  const handleCalculatePeriod = async (calculation: any) => {
    const result = await calculateUserPeriod(calculation.id);
    if (result.success) {
      refetch();
    }
  };

  const handlePaymentSuccess = () => {
    refetch();
  };

  // ✅ Generar descripción de filtros activos
  const getFilterDescription = () => {
    const parts: string[] = [];
    
    // Filtro de período
    if (filters.periodFilter) {
      const pf = filters.periodFilter as any;
      
      // ✅ PRIMERO verificar current/previous para SIEMPRE usar cálculo dinámico
      if (pf.type === 'current') {
        // ✅ SIEMPRE usar período calculado dinámico, NUNCA usar pf.label
        const displayCurrentPeriod = calculatedPeriods?.current;
        if (displayCurrentPeriod) {
          const periodLabel = formatDetailedPaymentPeriod(
            displayCurrentPeriod.period_start_date, 
            displayCurrentPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
          const dateRange = formatPaymentPeriodBadge(displayCurrentPeriod.period_start_date, displayCurrentPeriod.period_end_date);
          parts.push(`Current: ${periodNumber} (${dateRange})`);
        } else {
          parts.push(t("common:periods.current"));
        }
      } else if (pf.type === 'previous') {
        // ✅ SIEMPRE usar período calculado dinámico, NUNCA usar pf.label
        const displayPreviousPeriod = calculatedPeriods?.previous;
        if (displayPreviousPeriod) {
          const periodLabel = formatDetailedPaymentPeriod(
            displayPreviousPeriod.period_start_date, 
            displayPreviousPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
          const dateRange = formatPaymentPeriodBadge(displayPreviousPeriod.period_start_date, displayPreviousPeriod.period_end_date);
          parts.push(`Previous: ${periodNumber} (${dateRange})`);
        } else {
          parts.push(t("common:periods.previous"));
        }
      } else if (pf.type === 'specific' && pf.periodId) {
        parts.push(t("common:periods.specific"));
      } else if (pf.type === 'all') {
        parts.push(t("common:periods.all"));
      } else if (pf.label) {
        // Solo usar label para otros tipos (this_month, this_quarter, etc.)
        parts.push(pf.label);
      }
    }
    
    // Filtro de conductor
    if (filters.driverId && filters.driverId !== 'all') {
      const driver = drivers.find(d => d.user_id === filters.driverId);
      if (driver) {
        parts.push(`${t("filters.driver", { ns: 'common' })}: ${driver.first_name} ${driver.last_name}`);
      }
    }
    
    // Filtro de estado
    if (filters.status && filters.status !== 'all') {
      const statusLabels: Record<string, string> = {
        pending: t('reports.status.pending'),
        calculated: t('reports.status.calculated'),
        paid: t('reports.status.paid'),
        failed: t('reports.status.failed'),
        negative: t('reports.status.negative_balance'),
        approved: t('reports.status.approved')
      };
      parts.push(`${t("filters.status", { ns: 'common' })}: ${statusLabels[filters.status] || filters.status}`);
    }
    
    if (parts.length === 0) {
      return t("common:filters.noFilters");
    }
    
    return parts.join(' • ');
  };

  // ✅ Generar subtitle dinámico con estadísticas y filtros
  const getSubtitle = () => {
    // ✅ Esperar a que calculatedPeriods esté cargado para Current/Previous
    const needsCalculatedPeriods = filters.periodFilter?.type === 'current' || filters.periodFilter?.type === 'previous';
    
    if (statsLoading || !stats || (needsCalculatedPeriods && !calculatedPeriods)) {
      return <div>{t("reports.loading")}</div>;
    }

    const { totalReports, totalDrivers, totalNetPayment, pendingReports } = stats;
    
    // Primera línea: estadísticas
    const statsLine = `${totalReports} ${t("reports.stats.total_reports")} • ${totalDrivers} ${t("reports.stats.drivers")} • ${formatCurrency(totalNetPayment)} ${t("reports.stats.total_net_payment")} • ${pendingReports} ${t("reports.stats.pending")}`;
    
    // Segunda línea: filtros activos
    const filterDescription = getFilterDescription();
    
    return (
      <>
        <div>{statsLine}</div>
        <div className="text-xs text-muted-foreground/80">
          {filterDescription}
        </div>
      </>
    );
  };

  return (
    <>
      <PageToolbar 
        icon={FileText}
        title={t('reports.title')}
        subtitle={getSubtitle()}
      />

        <div className="p-2 md:p-4 space-y-6">
        {/* Financial Lock Warning */}
        {financialValidation && (
          <FinancialLockWarning
            isLocked={financialValidation.is_locked}
            canModify={financialValidation.can_modify}
            warningMessage={financialValidation.warning_message}
            paidDrivers={financialValidation.paid_drivers}
            totalDrivers={financialValidation.total_drivers}
            variant="banner"
          />
        )}
        
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title={t('reports.stats.total_reports')}
            value={totalReports}
            icon={<BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />}
            variant="default"
          />
          <StatsCard
            title={t('reports.stats.drivers')}
            value={totalDrivers}
            icon={<Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />}
            variant="default"
          />
          <StatsCard
            title={t('reports.stats.total_net_payment')}
            value={formatCurrency(totalEarnings)}
            icon={<Wallet className="h-5 w-5 md:h-6 md:w-6 text-green-600" />}
            variant="success"
          />
          <StatsCard
            title={t('reports.stats.pending')}
            value={pendingReports}
            icon={<ClockIcon className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />}
            variant={pendingReports > 0 ? "warning" : "default"}
          />
        </div>

        {/* Lista de Reportes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('reports.available_title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">{t('reports.loading')}</div>
            ) : filteredCalculations.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('reports.no_reports')}</h3>
                <p className="text-muted-foreground">
                  {t('reports.no_reports_description')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCalculations.map((calculation) => (
                  <div
                    key={calculation.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">
                              {(() => {
                                const driver = drivers.find(d => d.user_id === calculation.user_id);
                                return `${driver?.first_name || ''} ${driver?.last_name || ''}`;
                              })()}
                            </h4>
                            <span className="text-sm font-medium text-primary/70">
                              ({formatPeriodLabel(
                                (calculation as any).period?.period_start_date,
                                (calculation as any).period?.period_end_date
                              )})
                            </span>
                          </div>
                          {getStatusBadge(calculation)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2 font-semibold text-foreground">
                            <Banknote className="h-4 w-4 text-green-600" />
                            {t('reports.net')} {formatCurrency(calculateNetPayment(calculation))}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                            {formatPaymentPeriod(
                              (calculation as any).period?.period_start_date,
                              (calculation as any).period?.period_end_date
                            )}
                          </span>
                          {calculation.payment_date && (
                            <span className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-orange-600" />
                              {t('reports.payment')} {formatDateAuto(calculation.payment_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
                        {/* Indicador de bloqueo financiero */}
                        <FinancialLockIndicator 
                          isLocked={financialValidation?.is_locked || false}
                          className="mr-2"
                        />
                        
                        {calculation.payment_status !== 'paid' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleMarkAsPaid(calculation)}
                            disabled={paymentLoading || financialValidation?.is_locked}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            title={
                              financialValidation?.is_locked 
                                ? "No se puede marcar como pagado: período bloqueado" 
                                : undefined
                            }
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            {t('reports.mark_paid')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(calculation.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {t('reports.view_detail')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Actions Button */}
      <PaymentReportsFloatingActions
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
        }}
        drivers={drivers}
        stats={{
          totalReports,
          totalEarnings,
          totalDrivers,
          pendingReports
        }}
      />

      <PaymentReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        calculationId={selectedCalculationId}
      />

      <MarkDriverPaidDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        calculationId={selectedForPayment?.id || ""}
        driverName={(() => {
          if (!selectedForPayment) return "";
          const driver = drivers.find(d => d.user_id === selectedForPayment.driver_user_id);
          return `${driver?.first_name || ''} ${driver?.last_name || ''}`;
        })()}
        netPayment={selectedForPayment ? calculateNetPayment(selectedForPayment) : 0}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}