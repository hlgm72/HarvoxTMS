import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Calculator, DollarSign, Lock, Play, Users, Fuel, TrendingUp, Receipt, CreditCard, CreditCard as PaymentIcon } from "lucide-react";
import { formatPaymentPeriod, formatCurrency } from '@/lib/dateFormatting';
import { useFleetNotifications } from "@/components/notifications";
import { useClosePaymentPeriod } from "@/hooks/useClosePaymentPeriod";
import { useMarkMultipleDriversPaid } from "@/hooks/useMarkMultipleDriversPaid";
import { PaymentPeriodAlerts } from "./PaymentPeriodAlerts";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { useTranslation } from 'react-i18next';

// ===============================================
// 🚨 COMPONENTE DE DETALLES DE PERÍODOS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
// 
// Este componente procesa y muestra cálculos críticos de períodos de pago.
// Maneja agregaciones financieras, marcado de pagos y cierre de períodos.
// Cualquier error puede afectar pagos a conductores.
// 
// Ver: docs/CRITICAL-BUSINESS-LOGIC-PROTECTION.md

interface PaymentPeriodDetailsProps {
  periodId: string;
  onClose: () => void;
}

interface DriverCalculation {
  id: string;
  driver_user_id: string;
  gross_earnings: number;
  fuel_expenses: number;
  total_deductions: number;
  other_income: number;
  has_negative_balance: boolean;
  balance_alert_message?: string;
  payment_status: string;
  calculated_at?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function PaymentPeriodDetails({ periodId, onClose }: PaymentPeriodDetailsProps) {
  const { t } = useTranslation('payments');
  const { showSuccess, showError } = useFleetNotifications();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  const { mutate: closePeriod, isPending: isClosingPeriod } = useClosePaymentPeriod();
  const { mutate: markMultiplePaid, isPending: isMarkingPaid } = useMarkMultipleDriversPaid();

  // Función para cerrar el período
  const handleClosePeriod = () => {
    closePeriod({
      companyPeriodId: periodId
    }, {
      onSuccess: () => {
        refetchPeriod();
        refetchCalculations();
        onClose();
      }
    });
  };

  // Función para marcar conductores seleccionados como pagados
  const handleMarkAsPaid = () => {
    if (selectedDrivers.length === 0) {
      showError(t('mark_as_paid.select_drivers'), t('mark_as_paid.select_drivers_error'));
      return;
    }

    markMultiplePaid({
      calculationIds: selectedDrivers,
      paymentMethod: paymentMethod || undefined,
      paymentReference: paymentReference || undefined,
      notes: paymentNotes || undefined
    }, {
      onSuccess: () => {
        setSelectedDrivers([]);
        setPaymentMethod('');
        setPaymentReference('');
        setPaymentNotes('');
        refetchPeriod();
        refetchCalculations();
      }
    });
  };

  // Función para seleccionar/deseleccionar todos los conductores no pagados
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unpaidDrivers = driverCalculations
        .filter(calc => calc.payment_status !== 'paid')
        .map(calc => calc.id);
      setSelectedDrivers(unpaidDrivers);
    } else {
      setSelectedDrivers([]);
    }
  };

  // Obtener detalles del período
  const { data: period, refetch: refetchPeriod } = useQuery({
    queryKey: ['company-payment-period', periodId],
    queryFn: async () => {
      // ✅ Detectar períodos calculados y evitar queries inválidas
      if (periodId?.startsWith('calculated-')) {
        console.log('🔍 Período calculado detectado en PaymentPeriodDetails:', periodId, '- retornando datos simulados');
        return {
          id: periodId,
          company_id: 'calculated-company',
          period_start_date: '2025-09-01',
          period_end_date: '2025-09-07',
          period_frequency: 'weekly',
          status: 'calculated',
          period_type: 'regular',
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!periodId
  });

  // Obtener cálculos de conductores
  const { data: driverCalculations = [], refetch: refetchCalculations } = useQuery({
    queryKey: ['driver-period-calculations', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      
      // Obtener los cálculos primero
      const { data: calculations, error: calcError } = await supabase
        .from('user_payment_periods')
        .select('*')
        .eq('company_payment_period_id', periodId);

      if (calcError) throw calcError;
      if (!calculations || calculations.length === 0) return [];

      // Obtener los perfiles de los conductores
      const driverIds = calculations.map(calc => calc.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverIds);

      if (profilesError) throw profilesError;

      // Combinar los datos
      return calculations.map(calc => ({
        ...calc,
        profiles: profiles?.find(p => p.user_id === calc.user_id) || null
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
  const unpaidDrivers = driverCalculations.filter(d => d.payment_status !== 'paid');
  
  // 🚨 CRÍTICO - Agregaciones financieras fundamentales - NO MODIFICAR SIN AUTORIZACIÓN
  const totalGrossEarnings = driverCalculations.reduce((sum, d) => sum + (d.gross_earnings || 0), 0);
  const totalOtherIncome = driverCalculations.reduce((sum, d) => sum + (d.other_income || 0), 0);
  const totalFuelExpenses = driverCalculations.reduce((sum, d) => sum + (d.fuel_expenses || 0), 0);
  const totalDeductions = driverCalculations.reduce((sum, d) => sum + (d.total_deductions || 0), 0);
  const totalNetPayment = driverCalculations.reduce((sum, d) => sum + calculateNetPayment(d), 0); // 🚨 FUNCIÓN CRÍTICA

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
        
        <div className="flex gap-2">
          {period.status === 'open' && !period.is_locked && (
            <Button onClick={handleProcessPeriod} disabled={isProcessing}>
              <Calculator className="h-4 w-4 mr-2" />
              {t('period.process_period')}
            </Button>
          )}
          
          {/* Botón para cerrar período - solo visible si está calculado y no bloqueado */}
          {(period.status === 'calculated' || period.status === 'approved') && !period.is_locked && (
            <Button 
              onClick={handleClosePeriod} 
              disabled={isClosingPeriod}
              variant="destructive"
            >
              <Lock className="h-4 w-4 mr-2" />
              {isClosingPeriod ? 'Cerrando...' : 'Cerrar Período'}
            </Button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {driversWithNegativeBalance > 0 && (
        <PaymentPeriodAlerts 
          driversWithNegativeBalance={driversWithNegativeBalance}
          totalDrivers={totalDrivers}
        />
      )}

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t('summary.gross_income')}</h4>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(totalGrossEarnings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t('summary.other_income')}</h4>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold tracking-tight text-success">
                  {formatCurrency(totalOtherIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t('summary.total_deductions')}</h4>
                <Receipt className="h-5 w-5 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold tracking-tight text-destructive">
                  -{formatCurrency(totalDeductions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t('tabs.fuel_expenses')}</h4>
                <Fuel className="h-5 w-5 text-warning" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold tracking-tight text-warning">
                  -{formatCurrency(totalFuelExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden sm:col-span-2 xl:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Pago Neto</h4>
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(totalNetPayment)}
                </p>
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {totalDrivers} conductor{totalDrivers !== 1 ? 'es' : ''}
                  </span>
                  {driversWithNegativeBalance > 0 && (
                    <span className="text-xs text-destructive font-medium">
                      {driversWithNegativeBalance} con balance negativo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles */}
      <Tabs defaultValue="drivers" className="w-full">
        <TabsList>
          <TabsTrigger value="drivers">{t('period.tabs.drivers')}</TabsTrigger>
          <TabsTrigger value="summary">{t('period.tabs.summary')}</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4">
          {/* Panel de pagos múltiples */}
          {unpaidDrivers.length > 0 && !period.is_locked && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('period.process_payments')}</CardTitle>
                <CardDescription>
                  {t('period.select_drivers_description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedDrivers.length > 0 && selectedDrivers.length === unpaidDrivers.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all">
                    Seleccionar todos ({unpaidDrivers.length} sin pagar)
                  </Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="payment-method">Método de Pago</Label>
                    <Input
                      id="payment-method"
                      placeholder="ACH, Cheque, etc."
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-ref">Referencia</Label>
                    <Input
                      id="payment-ref"
                      placeholder="Número de referencia"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-notes">Notas</Label>
                    <Input
                      id="payment-notes"
                      placeholder="Notas adicionales"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedDrivers.length} conductor{selectedDrivers.length !== 1 ? 'es' : ''} seleccionado{selectedDrivers.length !== 1 ? 's' : ''}
                  </span>
                  <Button 
                    onClick={handleMarkAsPaid}
                    disabled={selectedDrivers.length === 0 || isMarkingPaid}
                  >
                    <PaymentIcon className="h-4 w-4 mr-2" />
                    {isMarkingPaid ? t('mark_as_paid.processing') : t('mark_as_paid.button')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de conductores */}
          {driverCalculations.map((calc) => (
            <Card key={calc.id} className={calc.has_negative_balance ? 'border-destructive' : calc.payment_status === 'paid' ? 'border-success' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {calc.payment_status !== 'paid' && !period.is_locked && (
                      <Checkbox
                        checked={selectedDrivers.includes(calc.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDrivers([...selectedDrivers, calc.id]);
                          } else {
                            setSelectedDrivers(selectedDrivers.filter(id => id !== calc.id));
                          }
                        }}
                      />
                    )}
                    <CardTitle className="text-base">
                      {calc.profiles?.first_name} {calc.profiles?.last_name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {calc.payment_status === 'paid' && (
                      <Badge variant="default">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Pagado
                      </Badge>
                    )}
                    {calc.has_negative_balance && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Balance Negativo
                      </Badge>
                    )}
                  </div>
                </div>
                {calc.balance_alert_message && (
                  <CardDescription className="text-destructive">
                    {calc.balance_alert_message}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('summary.gross_income')}</p>
                    <p className="font-semibold">
                      {formatCurrency(calc.gross_earnings || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('summary.other_income')}</p>
                    <p className="font-semibold text-success">
                      {formatCurrency(calc.other_income || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deducciones</p>
                    <p className="font-semibold text-destructive">
                      -{formatCurrency(calc.total_deductions || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('tabs.fuel_expenses')}</p>
                    <p className="font-semibold text-warning">
                      -{formatCurrency(calc.fuel_expenses || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pago Neto</p>
                    <p className={`font-semibold ${calculateNetPayment(calc) < 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(calculateNetPayment(calc))}
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
              <CardTitle>{t('period.summary_title')}</CardTitle>
              <CardDescription>
                {t('period.summary_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('period.period_label')}</p>
                  <p className="font-semibold">
                    {formatPaymentPeriod(period.period_start_date, period.period_end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('period.frequency_label')}</p>
                  <p className="font-semibold">{period.period_frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('period.type_label')}</p>
                  <p className="font-semibold">{period.period_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('period.status_label')}</p>
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