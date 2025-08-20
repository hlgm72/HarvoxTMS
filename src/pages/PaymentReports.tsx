import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { FileText, Plus, DollarSign, Timer, BarChart3, Users, Wallet, ClockIcon, Banknote, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPaymentPeriod, formatDateAuto, formatCurrency } from "@/lib/dateFormatting";
import { useFleetNotifications } from "@/components/notifications";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { generatePaymentReportPDF } from "@/lib/paymentReportPDF";
import { PaymentReportDialog } from "@/components/payments/PaymentReportDialog";
import { MarkDriverPaidDialog } from "@/components/payments/MarkDriverPaidDialog";
import { useDriverPaymentActions } from "@/hooks/useDriverPaymentActions";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { PaymentFilters, PaymentFiltersType } from "@/components/payments/PaymentFilters";
import { PaymentFiltersSheet } from "@/components/payments/PaymentFiltersSheet";
import { useCurrentPaymentPeriod, usePaymentPeriods, usePreviousPaymentPeriod, useNextPaymentPeriod } from "@/hooks/usePaymentPeriods";

export default function PaymentReports() {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  
  // Obtener períodos para inicializar con el período actual
  const { data: currentPeriod } = useCurrentPaymentPeriod();
  const { data: previousPeriod } = usePreviousPaymentPeriod();
  const { data: nextPeriod } = useNextPaymentPeriod();
  const { data: allPeriods } = usePaymentPeriods();
  
  const [filters, setFilters] = useState<PaymentFiltersType>({
    search: '',
    driverId: 'all',
    status: 'all',
    periodFilter: { type: 'current' }
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCalculationId, setSelectedCalculationId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<any>(null);
  
  const { markDriverAsPaid, calculateDriverPeriod, checkPeriodClosureStatus, isLoading: paymentLoading } = useDriverPaymentActions();

  // Actualizar filtro de período cuando se carga el período actual
  useEffect(() => {
    if (currentPeriod && filters.periodFilter.type === 'current' && !filters.periodFilter.periodId) {
      setFilters(prev => ({
        ...prev,
        periodFilter: {
          type: 'current',
          periodId: currentPeriod.id,
          startDate: currentPeriod.period_start_date,
          endDate: currentPeriod.period_end_date,
          label: `Período Actual (${formatPaymentPeriod(currentPeriod.period_start_date, currentPeriod.period_end_date)})`
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
        return previousPeriod ? [previousPeriod.id] : [];
      
      case 'next':
        return nextPeriod ? [nextPeriod.id] : [];
      
      case 'specific':
        return periodFilter.periodId ? [periodFilter.periodId] : [];
      
      case 'all':
        return allPeriods ? allPeriods.map(p => p.id) : [];
      
      case 'custom':
        // Para filtro personalizado, usaremos las fechas en la query
        return [];
      
      default:
        return currentPeriod ? [currentPeriod.id] : [];
    }
  }, [filters.periodFilter, currentPeriod, previousPeriod, nextPeriod, allPeriods]);

  // Obtener reportes existentes filtrados por período
  const { data: paymentCalculations = [], isLoading, refetch } = useQuery({
    queryKey: ['payment-calculations-reports', getFilterPeriodIds, filters.periodFilter],
    queryFn: async () => {
      console.log('🔍 PaymentReports Query - getFilterPeriodIds:', getFilterPeriodIds);
      console.log('🔍 PaymentReports Query - periodFilter:', filters.periodFilter);
      
      let query = supabase
        .from('driver_period_calculations')
        .select(`
          *,
          company_payment_periods!inner(
            id,
            period_start_date,
            period_end_date,
            company_id,
            payment_date
          )
        `)
        .order('created_at', { ascending: false });

      // Filtrar por períodos específicos si no es filtro personalizado
      if (filters.periodFilter.type !== 'custom' && getFilterPeriodIds.length > 0) {
        console.log('📊 Adding period filter for IDs:', getFilterPeriodIds);
        query = query.in('company_payment_period_id', getFilterPeriodIds);
      } else if (filters.periodFilter.type === 'custom' && filters.periodFilter.startDate && filters.periodFilter.endDate) {
        // Para filtro personalizado, usar las fechas
        console.log('📊 Adding custom date filter:', filters.periodFilter.startDate, 'to', filters.periodFilter.endDate);
        query = query
          .gte('company_payment_periods.period_start_date', filters.periodFilter.startDate)
          .lte('company_payment_periods.period_end_date', filters.periodFilter.endDate);
      } else if (filters.periodFilter.type === 'all') {
        console.log('📊 Showing all periods - no filter applied');
        // No agregar filtro para mostrar todos
      } else {
        console.log('📊 No period filter applied - no period IDs available yet');
        // Si no hay IDs de período, devolver array vacío para evitar mostrar todos
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ PaymentReports Query Error:', error);
        throw error;
      }
      
      console.log('✅ PaymentReports Query Result:', data?.length, 'calculations found');
      return data || [];
    },
    enabled: !!user && (
      filters.periodFilter.type === 'all' || 
      getFilterPeriodIds.length > 0 || 
      (filters.periodFilter.type === 'custom' && !!filters.periodFilter.startDate && !!filters.periodFilter.endDate)
    )
  });

  // Obtener conductores para filtro
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-for-reports'],
    queryFn: async () => {
      const driverIds = paymentCalculations.map(calc => calc.driver_user_id);
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
    const driver = drivers.find(d => d.user_id === calc.driver_user_id);
    const driverName = `${driver?.first_name || ''} ${driver?.last_name || ''}`.toLowerCase();
    
    // Filtro de búsqueda
    const matchesSearch = !filters.search || driverName.includes(filters.search.toLowerCase());
    
    // Filtro de conductor
    const matchesDriver = filters.driverId === "all" || calc.driver_user_id === filters.driverId;
    
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
    
    return matchesSearch && matchesDriver && matchesStatus;
  });

  // Estadísticas del dashboard
  const totalReports = filteredCalculations.length;
  const totalEarnings = filteredCalculations.reduce((sum, calc) => sum + calculateNetPayment(calc), 0);
  const totalDrivers = new Set(filteredCalculations.map(calc => calc.driver_user_id)).size;
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
          name: 'Tu Empresa'
        }
      };

      await generatePaymentReportPDF(reportData);
      showSuccess("Reporte Generado", "El reporte PDF ha sido generado y descargado exitosamente");
    } catch (error: any) {
      console.error('Error generating report:', error);
      showError("Error", "No se pudo generar el reporte PDF");
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
      return <Badge variant="outline">Pendiente</Badge>;
    }
    if (calculation.payment_status === 'paid') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Pagado</Badge>;
    }
    if (calculation.payment_status === 'failed') {
      return <Badge variant="destructive">Pago Fallido</Badge>;
    }
    if (calculation.has_negative_balance) {
      return <Badge variant="destructive">Balance Negativo</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">Listo para Pago</Badge>;
  };

  const handleMarkAsPaid = (calculation: any) => {
    setSelectedForPayment(calculation);
    setPaymentDialogOpen(true);
  };

  const handleCalculatePeriod = async (calculation: any) => {
    const result = await calculateDriverPeriod(calculation.id);
    if (result.success) {
      refetch();
    }
  };

  const handlePaymentSuccess = () => {
    refetch();
  };

  return (
    <>
      <PageToolbar 
        icon={FileText}
        title="Reportes de Pago"
        subtitle="Genera y administra reportes de pagos de conductores"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Generar Reporte Masivo
          </Button>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Reportes"
            value={totalReports}
            icon={<BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />}
            variant="default"
          />
          <StatsCard
            title="Conductores"
            value={totalDrivers}
            icon={<Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />}
            variant="default"
          />
          <StatsCard
            title="Pago Neto Total"
            value={`$${formatCurrency(totalEarnings)}`}
            icon={<Wallet className="h-5 w-5 md:h-6 md:w-6 text-green-600" />}
            variant="success"
          />
          <StatsCard
            title="Pendientes"
            value={pendingReports}
            icon={<ClockIcon className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />}
            variant={pendingReports > 0 ? "warning" : "default"}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filtros principales en desktop */}
          <div className="hidden lg:block flex-1">
            <PaymentFilters
              filters={filters}
              onFiltersChange={setFilters}
              drivers={drivers}
            />
          </div>
          
          {/* Filtros móviles con sheet */}
          <div className="lg:hidden">
            <PaymentFiltersSheet
              filters={filters}
              onFiltersChange={setFilters}
              drivers={drivers}
            />
          </div>
        </div>

        {/* Lista de Reportes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reportes de Pago Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Cargando reportes...</div>
            ) : filteredCalculations.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay reportes disponibles</h3>
                <p className="text-muted-foreground">
                  No se encontraron períodos de pago que coincidan con los filtros seleccionados.
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
                          <h4 className="font-semibold truncate">
                            {(() => {
                              const driver = drivers.find(d => d.user_id === calculation.driver_user_id);
                              return `${driver?.first_name || ''} ${driver?.last_name || ''}`;
                            })()}
                          </h4>
                          {getStatusBadge(calculation)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2 font-semibold text-foreground">
                            <Banknote className="h-4 w-4 text-green-600" />
                            Neto: ${formatCurrency(calculateNetPayment(calculation))}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                            {formatPaymentPeriod(
                              calculation.company_payment_periods.period_start_date,
                              calculation.company_payment_periods.period_end_date
                            )}
                          </span>
                          {calculation.company_payment_periods.payment_date && (
                            <span className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-orange-600" />
                              Pago: {formatDateAuto(calculation.company_payment_periods.payment_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
                        {calculation.payment_status !== 'paid' && calculation.calculated_at && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleMarkAsPaid(calculation)}
                            disabled={paymentLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Marcar Pagado
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(calculation.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Detalle
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