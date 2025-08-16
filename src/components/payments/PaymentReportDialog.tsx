import { useState, useEffect } from "react";
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
import { formatPaymentPeriod, formatDateAuto, formatCurrency } from "@/lib/dateFormatting";
import { generatePaymentReportPDF } from "@/lib/paymentReportPDF";
import { useFleetNotifications } from "@/components/notifications";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { EmailConfirmationDialog } from "./EmailConfirmationDialog";

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
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

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
            company_id,
            payment_date
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
          po_number,
          pickup_date,
          delivery_date,
          total_amount,
          client_id,
          customer_name,
          dispatching_percentage,
          factoring_percentage,
          leasing_percentage,
          load_stops(
            stop_type,
            company_name,
            city,
            state
          )
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

  // Obtener información de clientes para las cargas
  const { data: clients = [] } = useQuery({
    queryKey: ['period-clients', loads?.map(l => l.client_id).filter(Boolean)],
    queryFn: async () => {
      if (!loads || loads.length === 0) return [];
      
      const clientIds = [...new Set(loads.map(l => l.client_id).filter(Boolean))];
      if (clientIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('company_clients')
        .select('id, name, alias')
        .in('id', clientIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!loads && loads.length > 0
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

  // Obtener deducciones del período
  const { data: deductions = [] } = useQuery({
    queryKey: ['period-deductions', calculationId],
    queryFn: async () => {
      if (!calculationId) return [];
      
      console.log('🔍 Querying deductions for calculationId:', calculationId);
      
      const { data, error } = await supabase
        .from('expense_instances')
        .select(`
          id,
          amount,
          description,
          expense_date,
          status,
          expense_types(
            name,
            category
          )
        `)
        .eq('payment_period_id', calculationId)
        .in('status', ['applied', 'planned'])
        .order('expense_date', { ascending: true });

      if (error) {
        console.error('🚨 Error querying deductions:', error);
        console.error('🚨 Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Deductions query result:', data);
      console.log('✅ Deductions count from query:', data?.length || 0);
      
      // Verificar permisos adicionales
      console.log('🔐 Current user ID:', (await supabase.auth.getUser()).data.user?.id);
      
      return data || [];
    },
    enabled: !!calculationId
  });

  const getReportData = () => {
    if (!calculation || !driver || !company) return null;
    
    console.log('🔍 Report Data - Deductions count:', deductions.length);
    console.log('🔍 Report Data - Deductions:', deductions);
    
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
        net_payment: calculateNetPayment(calculation),
        payment_date: calculation.company_payment_periods.payment_date
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
      loads: loads.map(load => {
        const clientData = clients.find(c => c.id === load.client_id);
        let clientName = 'Sin cliente';
        
        if (clientData) {
          if (clientData.alias && clientData.alias.trim()) {
            clientName = clientData.alias;
          } else if (clientData.name && clientData.name.trim()) {
            clientName = clientData.name;
          }
        } else if (load.customer_name && load.customer_name.trim()) {
          clientName = load.customer_name;
        }
        
        return {
          load_number: load.load_number,
          po_number: load.po_number,
          pickup_date: load.pickup_date,
          delivery_date: load.delivery_date,
          client_name: clientName,
          total_amount: load.total_amount,
          dispatching_percentage: load.dispatching_percentage || 0,
          factoring_percentage: load.factoring_percentage || 0,
          leasing_percentage: load.leasing_percentage || 0,
          load_stops: load.load_stops || []
        };
      }),
      fuelExpenses: fuelExpenses.map(expense => ({
        transaction_date: expense.transaction_date,
        station_name: expense.station_name || 'Estación',
        gallons_purchased: expense.gallons_purchased || 0,
        total_amount: expense.total_amount || 0,
        price_per_gallon: expense.price_per_gallon || 0
      })),
      deductions: deductions.map(deduction => ({
        description: deduction.description,
        amount: deduction.amount,
        expense_date: deduction.expense_date
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

  const handleEmailButtonClick = () => {
    setShowEmailConfirm(true);
  };

  const handleConfirmSendEmail = async () => {
    if (!calculation || !driver || !company) return;
    
    setIsSendingEmail(true);
    setShowEmailConfirm(false);

    try {
      // Usar los datos que ya tenemos
      const reportData = getReportData();
      if (!reportData) {
        throw new Error('No se pudieron obtener los datos del reporte');
      }

      // Generar PDF completo usando jsPDF
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'letter');
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      let currentY = margin;

      // Header del reporte
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT REPORT', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Información de la empresa
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(company?.name || 'Company Name', pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
      if (company?.street_address) {
        doc.text(company.street_address, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
      }
      currentY += 10;

      // Información del conductor
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DRIVER INFORMATION', margin, currentY);
      currentY += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Driver: ${reportData.driver.name}`, margin, currentY);
      currentY += 6;
      doc.text(`Period: ${reportData.period.start_date} to ${reportData.period.end_date}`, margin, currentY);
      currentY += 6;
      if (reportData.period.payment_date) {
        doc.text(`Payment Date: ${reportData.period.payment_date}`, margin, currentY);
        currentY += 6;
      }
      currentY += 10;

      // Resumen financiero
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT SUMMARY', margin, currentY);
      currentY += 8;

      // Tabla de resumen
      const summaryData = [
        ['Gross Earnings', `$${reportData.period.gross_earnings.toFixed(2)}`],
        ['Other Income', `$${reportData.period.other_income.toFixed(2)}`],
        ['Total Income', `$${(reportData.period.gross_earnings + reportData.period.other_income).toFixed(2)}`],
        ['', ''],
        ['Total Deductions', `-$${reportData.period.total_deductions.toFixed(2)}`],
        ['Fuel Expenses', `-$${reportData.period.fuel_expenses.toFixed(2)}`],
        ['Total Expenses', `-$${(reportData.period.total_deductions + reportData.period.fuel_expenses).toFixed(2)}`],
        ['', ''],
        ['NET PAYMENT', `$${reportData.period.net_payment.toFixed(2)}`]
      ];

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      summaryData.forEach((row, index) => {
        const isTotal = row[0] === 'NET PAYMENT';
        const isSubtotal = row[0] === 'Total Income' || row[0] === 'Total Expenses';
        const isEmpty = row[0] === '';

        if (isEmpty) {
          currentY += 3;
          return;
        }

        if (isTotal) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          // Línea horizontal
          doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
          currentY += 2;
        } else if (isSubtotal) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
        }

        doc.text(row[0], margin, currentY);
        doc.text(row[1], pageWidth - margin, currentY, { align: 'right' });
        currentY += 7;

        if (isTotal) {
          // Línea horizontal doble
          doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
        }
      });

      currentY += 10;

      // Información de cargas si hay
      if (loads && loads.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('LOADS SUMMARY', margin, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        loads.slice(0, 10).forEach((load) => { // Limitar a 10 cargas para no exceder el espacio
          doc.text(`Load #${load.load_number}`, margin, currentY);
          doc.text(`$${load.total_amount.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
          currentY += 5;
          
          if (currentY > 250) { // Si llegamos al final de la página
            doc.addPage();
            currentY = margin;
          }
        });
      }

      // Footer
      const footerY = doc.internal.pageSize.height - 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('This is an automatically generated report. For questions, contact your dispatcher.', 
               pageWidth / 2, footerY, { align: 'center' });

      const pdfBlob = doc.output('blob');
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfArray = Array.from(new Uint8Array(pdfBuffer));

      const { formatDateSafe } = await import('@/lib/dateFormatting');

      const { data, error } = await supabase.functions.invoke('send-payment-report', {
        body: {
          to: 'hlgm72@gmail.com',
          subject: `Payment Report - ${reportData.driver.name} - ${formatDateSafe(reportData.period.start_date)}`,
          html: `
            <h2>Payment Report</h2>
            <p>Dear ${reportData.driver.name},</p>
            <p>Please find attached your payment report for the period from ${formatDateSafe(reportData.period.start_date)} to ${formatDateSafe(reportData.period.end_date)}.</p>
            <p><strong>Net Payment: $${reportData.period.net_payment.toFixed(2)}</strong></p>
            <p>Best regards,<br>${company?.name || 'Tu Empresa'}</p>
          `,
          pdf_data: pdfArray,
          pdf_filename: `PaymentReport_${reportData.driver.name.replace(/\s+/g, '_')}_${formatDateSafe(reportData.period.start_date).replace(/\//g, '-')}.pdf`
        }
      });

      if (error) throw error;

      showSuccess("Email Enviado", `Reporte enviado exitosamente a hlgm72@gmail.com`);
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
      <DialogContent className="w-[95vw] max-w-none sm:max-w-4xl h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-lg">
        <div className="p-4 sm:p-6 border-b shrink-0">
          <DialogHeader>
            <DialogTitle>Detalle del Reporte</DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="text-center py-8">
            {isLoading ? "Cargando..." : "No se encontraron datos"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none sm:max-w-4xl h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-lg">
        {/* Header fijo */}
        <div className="p-4 sm:p-6 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 min-w-0 text-base sm:text-lg">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">
                Reporte de Pago - {driver.display_name || `${driver.first_name} ${driver.last_name}`}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words mt-1">
              Período: {formatPaymentPeriod(
                calculation.company_payment_periods.period_start_date,
                calculation.company_payment_periods.period_end_date
              )}
              {calculation.company_payment_periods.payment_date && (
                <span className="block text-primary font-medium mt-1">
                  Fecha de Pago: {formatDateAuto(calculation.company_payment_periods.payment_date)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
          {/* Resumen Financiero */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Resumen Financiero
              </CardTitle>
              {calculation.has_negative_balance && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Balance Negativo</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span className="truncate">Ingresos Brutos</span>
                  </span>
                  <span className="font-semibold text-xs sm:text-sm">
                    ${formatCurrency(calculation.gross_earnings)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span className="truncate">Otros Ingresos</span>
                  </span>
                  <span className="font-semibold text-success text-xs sm:text-sm">
                    ${formatCurrency(calculation.other_income)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Fuel className="h-4 w-4 shrink-0" />
                    <span className="truncate">Combustible</span>
                  </span>
                  <span className="font-semibold text-warning text-xs sm:text-sm">
                    -${formatCurrency(calculation.fuel_expenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Receipt className="h-4 w-4 shrink-0" />
                    <span className="truncate">Deducciones</span>
                  </span>
                  <span className="font-semibold text-destructive text-xs sm:text-sm">
                    -${formatCurrency(calculation.total_deductions)}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-base sm:text-lg font-bold">
                <span>Pago Neto:</span>
                <span className={calculateNetPayment(calculation) >= 0 ? 'text-success' : 'text-destructive'}>
                  ${formatCurrency(calculateNetPayment(calculation))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cargas del Período */}
          {loads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                  Cargas del Período ({loads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loads.map((load) => (
                    <div key={load.id} className="py-3 border-b">
                      {/* Primera línea: Número de carga + fecha + cliente */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base">
                            {load.load_number} • {formatDateAuto(load.pickup_date)} • {(() => {
                              const clientData = clients.find(c => c.id === load.client_id);
                              let clientName = 'Sin cliente';
                              
                              if (clientData) {
                                if (clientData.alias && clientData.alias.trim()) {
                                  clientName = clientData.alias;
                                } else if (clientData.name && clientData.name.trim()) {
                                  clientName = clientData.name;
                                }
                              } else if (load.customer_name && load.customer_name.trim()) {
                                clientName = load.customer_name;
                              }
                              
                              return clientName;
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Segunda línea: Porcentajes + Monto */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {(load.dispatching_percentage > 0 || load.factoring_percentage > 0 || load.leasing_percentage > 0) ? (
                            <>
                              {load.dispatching_percentage > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Despacho: {load.dispatching_percentage}% (${formatCurrency((load.total_amount * load.dispatching_percentage) / 100)})
                                </Badge>
                              )}
                              {load.factoring_percentage > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Factoring: {load.factoring_percentage}% (${formatCurrency((load.total_amount * load.factoring_percentage) / 100)})
                                </Badge>
                              )}
                              {load.leasing_percentage > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Leasing: {load.leasing_percentage}% (${formatCurrency((load.total_amount * load.leasing_percentage) / 100)})
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin porcentajes aplicados</span>
                          )}
                        </div>
                        <div className="font-semibold sm:text-right shrink-0 text-sm sm:text-base">
                          ${formatCurrency(load.total_amount)}
                        </div>
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Fuel className="h-5 w-5 text-orange-600" />
                  Gastos de Combustible ({fuelExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fuelExpenses.map((expense) => (
                    <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="font-medium truncate text-sm sm:text-base">{expense.station_name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {expense.gallons_purchased} gal • {formatDateAuto(expense.transaction_date)}
                        </div>
                      </div>
                      <div className="font-semibold text-warning sm:text-right shrink-0 text-sm sm:text-base">
                        ${formatCurrency(expense.total_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deducciones */}
          {deductions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-red-600" />
                  Deducciones ({deductions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="font-medium truncate text-sm sm:text-base">{deduction.description}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatDateAuto(deduction.expense_date)} • {deduction.status === 'planned' ? 'Planificado' : 'Aplicado'}
                        </div>
                      </div>
                      <div className="font-semibold text-destructive sm:text-right shrink-0 text-sm sm:text-base">
                        -${formatCurrency(deduction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          </div>
        </div>

        {/* Footer fijo con acciones */}
        <div className="p-4 sm:p-6 border-t shrink-0 bg-background">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button 
              onClick={handlePreviewPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              size="sm"
              className="w-full sm:flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              <span className="truncate">{isGeneratingPDF ? 'Generando...' : 'Ver PDF'}</span>
            </Button>
            <Button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              size="sm"
              className="w-full sm:flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="truncate">{isGeneratingPDF ? 'Generando...' : 'Descargar PDF'}</span>
            </Button>
            <Button 
              variant="outline"
              onClick={handleEmailButtonClick}
              disabled={isSendingEmail}
              size="sm"
              className="w-full sm:flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              <span className="truncate">{isSendingEmail ? 'Enviando...' : 'Enviar por Email'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
      
      <EmailConfirmationDialog
        open={showEmailConfirm}
        onOpenChange={setShowEmailConfirm}
        onConfirm={handleConfirmSendEmail}
        recipientEmail={driver?.display_email || ''}
        driverName={driver?.display_name || `${driver?.first_name} ${driver?.last_name}`}
        isSending={isSendingEmail}
      />
    </Dialog>
  );
}