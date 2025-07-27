import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Calendar, Download, FileText, Search, Filter, Plus, DollarSign, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPaymentPeriod } from "@/lib/dateFormatting";
import { useFleetNotifications } from "@/components/notifications";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { generatePaymentReportPDF } from "@/lib/paymentReportPDF";
import { PaymentReportDialog } from "@/components/payments/PaymentReportDialog";

export default function PaymentReports() {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCalculationId, setSelectedCalculationId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Obtener reportes existentes (simulando con datos de cálculos)
  const { data: paymentCalculations = [], isLoading } = useQuery({
    queryKey: ['payment-calculations-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_period_calculations')
        .select(`
          *,
          company_payment_periods!inner(
            period_start_date,
            period_end_date,
            company_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
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

  // Filtrar cálculos según los filtros aplicados
  const filteredCalculations = paymentCalculations.filter(calc => {
    const driver = drivers.find(d => d.user_id === calc.driver_user_id);
    const driverName = `${driver?.first_name || ''} ${driver?.last_name || ''}`.toLowerCase();
    const matchesSearch = driverName.includes(searchTerm.toLowerCase());
    const matchesDriver = selectedDriver === "all" || calc.driver_user_id === selectedDriver;
    
    return matchesSearch && matchesDriver;
  });

  // Estadísticas del dashboard
  const totalReports = filteredCalculations.length;
  const totalEarnings = filteredCalculations.reduce((sum, calc) => sum + (calc.gross_earnings || 0), 0);
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
          net_payment: calculation.net_payment
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
    if (calculation.has_negative_balance) {
      return <Badge variant="destructive">Balance Negativo</Badge>;
    }
    return <Badge variant="default">Listo</Badge>;
  };

  return (
    <>
      <PageToolbar 
        title="Reportes de Pago"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Generar Reporte Masivo
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Reportes"
            value={totalReports}
            icon="📊"
            variant="default"
          />
          <StatsCard
            title="Conductores"
            value={totalDrivers}
            icon="👥"
            variant="default"
          />
          <StatsCard
            title="Ingresos Totales"
            value={`$${totalEarnings.toLocaleString('es-US', { minimumFractionDigits: 2 })}`}
            icon="💰"
            variant="success"
          />
          <StatsCard
            title="Pendientes"
            value={pendingReports}
            icon="⏳"
            variant={pendingReports > 0 ? "warning" : "default"}
          />
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conductor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los conductores</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.user_id} value={driver.user_id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="ready">Listos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="negative">Balance Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Reportes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Períodos de Pago Disponibles
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
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">
                            {(() => {
                              const driver = drivers.find(d => d.user_id === calculation.driver_user_id);
                              return `${driver?.first_name || ''} ${driver?.last_name || ''}`;
                            })()}
                          </h4>
                          {getStatusBadge(calculation)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatPaymentPeriod(
                              calculation.company_payment_periods.period_start_date,
                              calculation.company_payment_periods.period_end_date
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            Neto: ${calculation.net_payment?.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                          </span>
                          {calculation.calculated_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(calculation.calculated_at).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReport(calculation)}
                          disabled={isGenerating}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {isGenerating ? "Generando..." : "PDF"}
                        </Button>
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
    </>
  );
}