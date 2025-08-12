import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Mail, 
  Calendar, 
  DollarSign, 
  Fuel, 
  Receipt, 
  TrendingUp,
  AlertTriangle,
  Package,
  FileText,
  Eye
} from "lucide-react";
import { formatPaymentPeriod } from "@/lib/dateFormatting";
import { generatePaymentReportPDF } from "@/lib/paymentReportPDF";
import { useFleetNotifications } from "@/components/notifications";
import { calculateNetPayment } from "@/lib/paymentCalculations";

interface PaymentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculationId: string | null;
}

export function PaymentReportDialog({ 
  open, 
  onOpenChange, 
  calculationId 
}: PaymentReportDialogProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Obtener datos completos del cálculo
  const { data: calculation, isLoading } = useQuery({
    queryKey: ['payment-calculation-detail', calculationId],
    queryFn: async () => {
      if (!calculationId) return null;
      
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
        .eq('id', calculationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!calculationId && open
  });

  // Obtener información del conductor
  const { data: driver } = useQuery({
    queryKey: ['driver-info', calculation?.driver_user_id],
    queryFn: async () => {
      if (!calculation?.driver_user_id) return null;
      
      // Obtener datos básicos del perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, street_address, zip_code, state_id, city')
        .eq('user_id', calculation.driver_user_id)
        .single();

      if (profileError) throw profileError;

      // Obtener email del conductor
      const { data: emailData } = await supabase.rpc('get_user_email_by_id', {
        user_id_param: calculation.driver_user_id
      });

      // Obtener información adicional del conductor
      const { data: driverData } = await supabase
        .from('driver_profiles')
        .select('license_number, license_state')
        .eq('user_id', calculation.driver_user_id)
        .maybeSingle();

      // Obtener datos completos de owner_operators si existe
      const { data: ownerData } = await supabase
        .from('owner_operators')
        .select('business_name, business_address, business_email, business_phone, tax_id, is_active')
        .eq('user_id', calculation.driver_user_id)
        .eq('is_active', true)
        .maybeSingle();

      // La ciudad ahora se almacena directamente como texto
      let cityName = profileData.city || null;

      // Lógica para determinar qué información usar
      // Si es Owner Operator y tiene datos de negocio, usar esos datos
      // Si no, usar los datos del perfil personal
      const useOwnerOperatorData = ownerData && (ownerData.business_name || ownerData.business_address);
      
      return {
        ...profileData,
        license_number: driverData?.license_number || null,
        license_state: driverData?.license_state || null,
        city_name: cityName,
        // Usar datos de Owner Operator si existen, sino usar datos del perfil
        display_name: useOwnerOperatorData ? ownerData.business_name : `${profileData.first_name} ${profileData.last_name}`,
        display_address: useOwnerOperatorData 
          ? ownerData.business_address 
          : profileData.street_address && cityName && profileData.state_id && profileData.zip_code
            ? `${profileData.street_address}\n${cityName}, ${profileData.state_id} ${profileData.zip_code}`
            : profileData.street_address,
        display_email: useOwnerOperatorData ? ownerData.business_email : emailData, // Email desde auth.users
        display_phone: useOwnerOperatorData ? ownerData.business_phone : profileData.phone,
        tax_id: ownerData?.tax_id || null,
        is_owner_operator: !!useOwnerOperatorData
      };
    },
    enabled: !!calculation?.driver_user_id
  });

  // Obtener información de la compañía
  const { data: company } = useQuery({
    queryKey: ['company-info', calculation?.company_payment_periods?.company_id],
    queryFn: async () => {
      if (!calculation?.company_payment_periods?.company_id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id, name, street_address, zip_code, state_id, city, phone, email, logo_url
        `)
        .eq('id', calculation.company_payment_periods.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!calculation?.company_payment_periods?.company_id
  });

  // Obtener cargas del período
  const { data: loads = [] } = useQuery({
    queryKey: ['period-loads', calculation?.company_payment_period_id, calculation?.driver_user_id],
    queryFn: async () => {
      if (!calculation) return [];
      
      const { data, error } = await supabase
        .from('loads')
        .select(`
          id,
          load_number,
          pickup_date,
          delivery_date,
          total_amount
        `)
        .eq('driver_user_id', calculation.driver_user_id)
        .gte('pickup_date', calculation.company_payment_periods.period_start_date)
        .lte('delivery_date', calculation.company_payment_periods.period_end_date)
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!calculation
  });

  // Obtener gastos de combustible del período
  const { data: fuelExpenses = [] } = useQuery({
    queryKey: ['period-fuel-expenses', calculation?.company_payment_period_id, calculation?.driver_user_id],
    queryFn: async () => {
      if (!calculation) return [];
      
      const { data, error } = await supabase
        .from('fuel_expenses')
        .select('*')
        .eq('driver_user_id', calculation.driver_user_id)
        .eq('payment_period_id', calculation.company_payment_period_id)
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!calculation
  });

  const getReportData = () => {
    if (!calculation || !driver || !company) return null;
    
    return {
      driver: {
        name: driver.display_name || `${driver.first_name} ${driver.last_name}`,
        user_id: calculation.driver_user_id,
        license: driver.license_number,
        license_state: driver.license_state,
        phone: driver.display_phone,
        address: driver.display_address,
        email: driver.display_email
      },
      period: {
        start_date: calculation.company_payment_periods.period_start_date,
        end_date: calculation.company_payment_periods.period_end_date,
        gross_earnings: calculation.gross_earnings,
        fuel_expenses: calculation.fuel_expenses,
        total_deductions: calculation.total_deductions,
        other_income: calculation.other_income,
        net_payment: calculateNetPayment(calculation)
      },
      company: {
        name: company.name || 'Tu Empresa',
        address: company.street_address && company.city && company.state_id && company.zip_code
          ? `${company.street_address}\n${company.city}, ${company.state_id} ${company.zip_code}`
          : [
              company.street_address,
              [company.city, company.state_id, company.zip_code].filter(Boolean).join(', ')
            ].filter(Boolean).join(', '),
        phone: company.phone,
        email: company.email,
        logo_url: company.logo_url
      },
      loads: loads.map(load => ({
        load_number: load.load_number,
        pickup_date: load.pickup_date,
        delivery_date: load.delivery_date,
        client_name: 'Cliente',
        total_amount: load.total_amount
      })),
      fuelExpenses: fuelExpenses.map(expense => ({
        transaction_date: expense.transaction_date,
        station_name: expense.station_name || 'Estación',
        gallons_purchased: expense.gallons_purchased || 0,
        total_amount: expense.total_amount || 0,
        price_per_gallon: expense.price_per_gallon || 0
      }))
    };
  };

  const handleGeneratePDF = async () => {
    const reportData = getReportData();
    if (!reportData) return;
    
    setIsGeneratingPDF(true);
    try {
      await generatePaymentReportPDF(reportData);
      showSuccess("PDF Generado", "El reporte se ha descargado exitosamente");
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      showError("Error", "No se pudo generar el PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePreviewPDF = async () => {
    const reportData = getReportData();
    if (!reportData) return;
    
    setIsGeneratingPDF(true);
    try {
      await generatePaymentReportPDF(reportData, true); // true for preview mode
      showSuccess("PDF Abierto", "El reporte se ha abierto en una nueva pestaña");
    } catch (error: any) {
      console.error('Error previewing PDF:', error);
      showError("Error", "No se pudo abrir la vista previa");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!calculation || !driver) return;
    
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-report', {
        body: {
          driver_user_id: calculation.driver_user_id,
          period_id: calculation.id,
          company_name: 'Tu Empresa'
        }
      });

      if (error) throw error;

      showSuccess("Email Enviado", "Reporte enviado exitosamente");
    } catch (error: any) {
      console.error('Error sending email:', error);
      showError("Error", "No se pudo enviar el email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!calculation || !driver) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6 rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Reporte</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            {isLoading ? "Cargando..." : "No se encontraron datos"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6 rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">
              Reporte de Pago - {driver.display_name || `${driver.first_name} ${driver.last_name}`}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm break-words">
            Período: {formatPaymentPeriod(
              calculation.company_payment_periods.period_start_date,
              calculation.company_payment_periods.period_end_date
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Resumen Financiero */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Resumen Financiero</CardTitle>
              {calculation.has_negative_balance && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Balance Negativo</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Ingresos Brutos
                    </span>
                    <span className="font-semibold">
                      ${calculation.gross_earnings.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Otros Ingresos
                    </span>
                    <span className="font-semibold text-success">
                      ${calculation.other_income.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Fuel className="h-4 w-4" />
                      Combustible
                    </span>
                    <span className="font-semibold text-warning">
                      -${calculation.fuel_expenses.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Receipt className="h-4 w-4" />
                      Deducciones
                    </span>
                    <span className="font-semibold text-destructive">
                      -${calculation.total_deductions.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Pago Neto:</span>
                <span className={calculateNetPayment(calculation) >= 0 ? 'text-success' : 'text-destructive'}>
                  ${calculateNetPayment(calculation).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cargas del Período */}
          {loads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Cargas del Período ({loads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loads.map((load) => (
                    <div key={load.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b">
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium truncate">{load.load_number}</div>
                        <div className="text-sm text-muted-foreground break-words">
                          Cliente • {new Date(load.pickup_date).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <div className="font-semibold sm:text-right">
                        ${load.total_amount.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gastos de Combustible */}
          {fuelExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Gastos de Combustible ({fuelExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fuelExpenses.map((expense) => (
                    <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b">
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium truncate">{expense.station_name}</div>
                        <div className="text-sm text-muted-foreground break-words">
                          {expense.gallons_purchased} gal • {new Date(expense.transaction_date).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <div className="font-semibold text-warning sm:text-right">
                        ${expense.total_amount.toLocaleString('es-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
            <Button 
              onClick={handlePreviewPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              className="w-full sm:flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generando...' : 'Ver PDF'}
            </Button>
            <Button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="w-full sm:flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generando...' : 'Descargar PDF'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="w-full sm:flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSendingEmail ? 'Enviando...' : 'Enviar por Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}