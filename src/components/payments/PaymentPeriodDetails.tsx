import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Calculator, DollarSign, Lock, Play, Users } from "lucide-react";
import { formatPaymentPeriod } from '@/lib/dateFormatting';
import { useFleetNotifications } from "@/components/notifications";
import { PaymentPeriodAlerts } from "./PaymentPeriodAlerts";

interface PaymentPeriodDetailsProps {
  periodId: string;
  onClose: () => void;
}

interface DriverCalculation {
  id: string;
  driver_user_id: string;
  gross_earnings: number;
  total_deductions: number;
  other_income: number;
  total_income: number;
  net_payment: number;
  has_negative_balance: boolean;
  balance_alert_message?: string;
  calculated_at?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function PaymentPeriodDetails({ periodId, onClose }: PaymentPeriodDetailsProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  // Obtener detalles del período
  const { data: period, refetch: refetchPeriod } = useQuery({
    queryKey: ['company-payment-period', periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Obtener cálculos de conductores
  const { data: driverCalculations = [], refetch: refetchCalculations } = useQuery({
    queryKey: ['driver-period-calculations', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      
      // Obtener los cálculos primero
      const { data: calculations, error: calcError } = await supabase
        .from('driver_period_calculations')
        .select('*')
        .eq('company_payment_period_id', periodId);

      if (calcError) throw calcError;
      if (!calculations || calculations.length === 0) return [];

      // Obtener los perfiles de los conductores
      const driverIds = calculations.map(calc => calc.driver_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverIds);

      if (profilesError) throw profilesError;

      // Combinar los datos
      return calculations.map(calc => ({
        ...calc,
        profiles: profiles?.find(p => p.user_id === calc.driver_user_id) || null
      }));
    },
    enabled: !!periodId
  });

  const handleProcessPeriod = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_company_payment_period', {
        company_payment_period_id: periodId
      });

      if (error) throw error;

      showSuccess("Período Procesado", "Período procesado exitosamente");

      refetchPeriod();
      refetchCalculations();
    } catch (error: any) {
      console.error('Error processing period:', error);
      showError("Error", error.message || "No se pudo procesar el período");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!period) {
    return <div>Cargando...</div>;
  }

  const totalDrivers = driverCalculations.length;
  const driversWithNegativeBalance = driverCalculations.filter(d => d.has_negative_balance).length;
  const totalGrossEarnings = driverCalculations.reduce((sum, d) => sum + (d.gross_earnings || 0), 0);
  const totalDeductions = driverCalculations.reduce((sum, d) => sum + (d.total_deductions || 0), 0);
  const totalNetPayment = driverCalculations.reduce((sum, d) => sum + (d.net_payment || 0), 0);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'processing': return 'secondary';
      case 'calculated': return 'outline';
      case 'needs_review': return 'destructive';
      case 'approved': return 'default';
      case 'paid': return 'default';
      case 'locked': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header del período */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {formatPaymentPeriod(period.period_start_date, period.period_end_date)}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusBadgeVariant(period.status)}>
              {period.status}
            </Badge>
            {period.is_locked && (
              <Badge variant="outline">
                <Lock className="h-3 w-3 mr-1" />
                Bloqueado
              </Badge>
            )}
          </div>
        </div>
        
        {period.status === 'open' && (
          <Button onClick={handleProcessPeriod} disabled={isProcessing}>
            {isProcessing ? (
              "Procesando..."
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Procesar Período
              </>
            )}
          </Button>
        )}
      </div>

      {/* Alertas */}
      {driversWithNegativeBalance > 0 && (
        <PaymentPeriodAlerts 
          driversWithNegativeBalance={driversWithNegativeBalance}
          totalDrivers={totalDrivers}
        />
      )}

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Brutos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalGrossEarnings.toLocaleString('es-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deducciones</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -${totalDeductions.toLocaleString('es-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago Neto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalNetPayment.toLocaleString('es-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conductores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
            {driversWithNegativeBalance > 0 && (
              <p className="text-xs text-destructive mt-1">
                {driversWithNegativeBalance} con balance negativo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles */}
      <Tabs defaultValue="drivers" className="w-full">
        <TabsList>
          <TabsTrigger value="drivers">Conductores</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4">
          {driverCalculations.map((calc) => (
            <Card key={calc.id} className={calc.has_negative_balance ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {calc.profiles?.first_name} {calc.profiles?.last_name}
                  </CardTitle>
                  {calc.has_negative_balance && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Balance Negativo
                    </Badge>
                  )}
                </div>
                {calc.balance_alert_message && (
                  <CardDescription className="text-destructive">
                    {calc.balance_alert_message}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ingresos Brutos</p>
                    <p className="font-semibold">
                      ${(calc.gross_earnings || 0).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deducciones</p>
                    <p className="font-semibold text-destructive">
                      -${(calc.total_deductions || 0).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Otros Ingresos</p>
                    <p className="font-semibold">
                      ${(calc.other_income || 0).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pago Neto</p>
                    <p className={`font-semibold ${calc.net_payment < 0 ? 'text-destructive' : ''}`}>
                      ${(calc.net_payment || 0).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Período</CardTitle>
              <CardDescription>
                Detalles completos del período de pago
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-semibold">
                    {formatPaymentPeriod(period.period_start_date, period.period_end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Frecuencia</p>
                  <p className="font-semibold">{period.period_frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-semibold">{period.period_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-semibold">{period.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}