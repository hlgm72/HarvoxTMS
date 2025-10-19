// ===============================================
// 🚨 COMPONENTE GENERACIÓN PDF REPORTES - CRÍTICO v1.0
// ===============================================
// Este componente maneja la visualización y generación de reportes
// de pago en PDF. Es crítico para la funcionalidad de reportes
// financieros del sistema. NO MODIFICAR SIN AUTORIZACIÓN.
// ===============================================

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
  Eye,
  Edit
} from "lucide-react";
import { formatPaymentPeriod, formatDateAuto, formatDateSafe, formatCurrency } from "@/lib/dateFormatting";
import { format } from "date-fns";
import { generatePaymentReportPDF } from "@/lib/paymentReportPDF";
import { calculateWeekNumberFromString } from "@/utils/weekCalculation";
import { useFleetNotifications } from "@/components/notifications";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { EmailConfirmationDialog } from "./EmailConfirmationDialog";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation('payments');
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showEditLoadDialog, setShowEditLoadDialog] = useState(false);
  const [selectedLoadForEdit, setSelectedLoadForEdit] = useState<any>(null);

  // Obtener datos completos del cálculo
  const { data: calculation, isLoading } = useQuery({
    queryKey: ['payment-calculation-detail', calculationId],
    queryFn: async () => {
      if (!calculationId) return null;
      
      const { data, error } = await supabase
        .from('user_payrolls')
        .select(`
          *,
          period:company_payment_periods!company_payment_period_id(
            period_start_date,
            period_end_date,
            period_frequency
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
    queryKey: ['driver-info', calculation?.user_id],
    queryFn: async () => {
      if (!calculation?.user_id) return null;
      
      // Obtener datos básicos del perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, street_address, zip_code, state_id, city')
        .eq('user_id', calculation.user_id)
        .single();

      if (profileError) throw profileError;

      // Obtener email del conductor
      const { data: emailData } = await supabase.rpc('get_user_email_by_id', {
        user_id_param: calculation.user_id
      });

      // Obtener información adicional del conductor
      const { data: driverData } = await supabase
        .from('driver_profiles')
        .select('license_number, license_state')
        .eq('user_id', calculation.user_id)
        .maybeSingle();

      // Obtener datos completos de owner_operators si existe
      const { data: ownerData } = await supabase
        .from('owner_operators')
        .select('business_name, business_address, business_email, business_phone, tax_id, is_active')
        .eq('user_id', calculation.user_id)
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
    enabled: !!calculation?.user_id
  });

  // Obtener información de la compañía
  const { data: company } = useQuery({
    queryKey: ['company-info', calculation?.company_id],
    queryFn: async () => {
      if (!calculation?.company_id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id, name, street_address, zip_code, state_id, city, phone, email, logo_url
        `)
        .eq('id', calculation.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!calculation?.company_id
  });

  // Obtener cargas del período
  const { data: loads = [] } = useQuery({
    queryKey: ['period-loads', calculation?.id, calculation?.user_id],
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
        .eq('driver_user_id', calculation.user_id)
        .gte('pickup_date', (calculation as any).period?.period_start_date)
        .lte('delivery_date', (calculation as any).period?.period_end_date)
        .order('pickup_date', { ascending: true});

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
    queryKey: ['period-fuel-expenses', calculation?.id, calculation?.user_id],
    queryFn: async () => {
      if (!calculation) return [];
      
      // ✅ CORREGIDO: payment_period_id debe ser company_payment_period_id
      const { data, error } = await supabase
        .from('fuel_expenses')
        .select('*')
        .eq('driver_user_id', calculation.user_id)
        .eq('payment_period_id', calculation.company_payment_period_id)
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!calculation
  });

  // Obtener deducciones del período
  const { data: deductions = [] } = useQuery({
    queryKey: ['period-deductions', calculation?.company_payment_period_id, calculation?.user_id],
    queryFn: async () => {
      if (!calculation?.company_payment_period_id || !calculation?.user_id) return [];
      
      console.log('🔍 Querying deductions for company_payment_period:', calculation.company_payment_period_id, 'user:', calculation.user_id);
      
      // ✅ CORREGIDO: payment_period_id en expense_instances es el company_payment_period_id
      const { data, error } = await supabase
        .from('expense_instances')
        .select(`
          id,
          amount,
          description,
          expense_date,
          status,
          payment_period_id,
          user_id,
          expense_types(
            name,
            category
          )
        `)
        .eq('payment_period_id', calculation.company_payment_period_id)
        .eq('user_id', calculation.user_id)
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
      
      // Debug: Calcular manualmente los totales esperados por tipo de deducción
      if (data && data.length > 0) {
        const leasingTotal = data.filter(d => d.expense_types?.name === 'Leasing Fee').reduce((sum, d) => sum + d.amount, 0);
        const factoringTotal = data.filter(d => d.expense_types?.name === 'Factoring Fee').reduce((sum, d) => sum + d.amount, 0);
        const dispatchingTotal = data.filter(d => d.expense_types?.name === 'Dispatching Fee').reduce((sum, d) => sum + d.amount, 0);
        
        console.log('📊 DEDUCTION TOTALS FROM DB BY TYPE:');
        console.log('  Leasing Total from DB:', leasingTotal);
        console.log('  Factoring Total from DB:', factoringTotal);
        console.log('  Dispatching Total from DB:', dispatchingTotal);
        console.log('  Grand Total from DB:', leasingTotal + factoringTotal + dispatchingTotal);
        
        console.log('📊 AVAILABLE EXPENSE TYPES:');
        data.forEach(d => console.log(`  - ${d.expense_types?.name}: $${d.amount}`));
      }
      
      return data || [];
    },
    enabled: !!calculation?.company_payment_period_id && !!calculation?.user_id
  });

  // 🚨 FUNCIÓN CRÍTICA - NO MODIFICAR SIN AUTORIZACIÓN
  // Esta función prepara los datos para el reporte PDF
  // Cualquier cambio puede afectar la exactitud de los reportes financieros
  const getReportData = () => {
    if (!calculation || !driver || !company) return null;
    
    console.log('🔍 Report Data - Deductions count:', deductions.length);
    console.log('🔍 Report Data - Deductions:', deductions);
    
    // Usar los totales precalculados de user_payment_periods
    console.log('💰 USING PRECALCULATED TOTALS FROM DB:');
    console.log('  Total Deductions from calculation:', calculation.total_deductions);
    console.log('  Gross Earnings from calculation:', calculation.gross_earnings);
    console.log('  Net Payment from calculation:', calculation.net_payment);
    
    return {
      driver: {
        name: driver.display_name || `${driver.first_name} ${driver.last_name}`,
        user_id: calculation.user_id,
        license: driver.license_number,
        license_state: driver.license_state,
        phone: driver.display_phone,
        address: driver.display_address,
        email: driver.display_email
      },
      period: {
        start_date: (calculation as any).period?.period_start_date || '',
        end_date: (calculation as any).period?.period_end_date || '',
        gross_earnings: calculation.gross_earnings,
        fuel_expenses: calculation.fuel_expenses,
        total_deductions: calculation.total_deductions,
        other_income: calculation.other_income,
        net_payment: calculateNetPayment(calculation),
        payment_date: calculation.payment_date
      },
      company: {
        name: company.name || t('reports.company_name'),
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
               let clientName = t('report_dialog.load_details.client');
        
        // Debug: Log individual load percentage calculations
        const dispatchingAmount = (load.total_amount * (load.dispatching_percentage || 0)) / 100;
        const factoringAmount = (load.total_amount * (load.factoring_percentage || 0)) / 100;
        const leasingAmount = (load.total_amount * (load.leasing_percentage || 0)) / 100;
        
        console.log(`🚛 LOAD ${load.load_number}:`, {
          total_amount: load.total_amount,
          dispatching_percentage: load.dispatching_percentage,
          factoring_percentage: load.factoring_percentage,
          leasing_percentage: load.leasing_percentage,
          calculated_dispatching: dispatchingAmount,
          calculated_factoring: factoringAmount,
          calculated_leasing: leasingAmount
        });
        
        if (clientData) {
          if (clientData.alias && clientData.alias.trim()) {
            clientName = clientData.alias;
        } else if (clientData.name && clientData.name.trim()) {
            clientName = clientData.name;
          }
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
        station_name: expense.station_name || t('deductions.status.station'),
        station_city: expense.station_city,
        station_state: expense.station_state,
        gallons_purchased: expense.gallons_purchased || 0,
        total_amount: expense.total_amount || 0,
        price_per_gallon: expense.price_per_gallon || 0
      })),
      deductions: deductions.map(deduction => ({
        name: deduction.expense_types?.name || deduction.description,
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
    console.log('🚀 handlePreviewPDF: Iniciando...');
    const reportData = getReportData();
    if (!reportData) {
      console.log('❌ handlePreviewPDF: No hay reportData');
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      console.log('🔄 handlePreviewPDF: Generando PDF documento...');
      
      // Usar el método de preview del generatePaymentReportPDF que ya maneja el nombre correctamente
      await generatePaymentReportPDF(reportData, true);
      
      console.log('✅ handlePreviewPDF: PDF abierto en nueva ventana con nombre correcto');
      showSuccess(t('report_dialog.messages.pdf_generated'), t('report_dialog.messages.pdf_opened'));
      
    } catch (error: any) {
      console.error('❌ handlePreviewPDF: Error generating PDF:', error);
      showError(t('actions.error'), t('report_dialog.messages.pdf_error'));
    } finally {
      setIsGeneratingPDF(false);
      console.log('🏁 handlePreviewPDF: Proceso completado');
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
      // Consultar el idioma preferido del conductor
      const { data: driverPreferences } = await supabase
        .from('user_preferences')
        .select('preferred_language')
        .eq('user_id', calculation.user_id)
        .maybeSingle();

      const driverLanguage = driverPreferences?.preferred_language || 'en';

      // Usar los datos que ya tenemos
      const reportData = getReportData();
      if (!reportData) {
        throw new Error('No se pudieron obtener los datos del reporte');
      }

      // Generar PDF usando la función existente correcta
      const { generatePaymentReportPDF } = await import('@/lib/paymentReportPDF');
      
      // Usar la función existente que genera el PDF completo
      const doc = await generatePaymentReportPDF(reportData, false);
      
      if (!doc) {
        throw new Error('Error generando el PDF');
      }

      const pdfBlob = doc.output('blob');
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfArray = Array.from(new Uint8Array(pdfBuffer));

      const { formatDateSafe } = await import('@/lib/dateFormatting');
      const { getEmailTranslations, interpolateText } = await import('@/lib/emailTranslations');

      // Obtener traducciones según el idioma del conductor
      const translations = getEmailTranslations(driverLanguage);
      
      // Variables para interpolación
      const variables = {
        driverName: reportData.driver.name,
        startDate: formatDateSafe(reportData.period.start_date),
        endDate: formatDateSafe(reportData.period.end_date),
        period: formatDateSafe(reportData.period.end_date, "yyyy/'W'ww")
      };

      // Crear HTML profesional con traducciones dinámicas
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Report - ${reportData.driver.name}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f6f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: #002652; padding: 30px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                <img src="https://htaotttcnjxqzpsrqwll.supabase.co/storage/v1/object/public/fleetnest/logo_64x64.png" 
                     alt="FleetNest Logo" 
                     style="width: 40px; height: 40px; object-fit: contain;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${translations.header.title}</h1>
              </div>
              <p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 16px;">${translations.header.subtitle}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">${interpolateText(translations.greeting, variables)}</h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
                ${interpolateText(translations.content.attachmentMessage, variables)}
              </p>
              
              <!-- Summary Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #e5e7eb;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">${translations.content.totalLoads}</td>
                  <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; color: #1f2937; text-align: right;">${loads.length}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">${translations.content.grossEarnings}</td>
                  <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; color: #059669; text-align: right; font-weight: bold;">$${(reportData.period.gross_earnings + reportData.period.other_income).toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">${translations.content.totalExpenses}</td>
                  <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; color: #dc2626; text-align: right;">$${(reportData.period.fuel_expenses + reportData.period.total_deductions).toFixed(2)}</td>
                </tr>
                <tr style="background-color: #2563eb; color: white;">
                  <td style="padding: 20px; font-weight: bold; font-size: 18px;">${translations.content.netPayment}</td>
                  <td style="padding: 20px; text-align: right; font-weight: bold; font-size: 20px;">$${reportData.period.net_payment.toFixed(2)}</td>
                </tr>
              </table>
              
              <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 25px;">
                <p style="margin: 0; color: #1e40af; font-weight: 500;">
                  ${translations.content.attachmentNote}
                </p>
              </div>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                ${translations.content.questionContact}
              </p>
              
              <p style="color: #4b5563; line-height: 1.6;">
                ${translations.content.closing}<br>
                <strong>${company?.name || 'FleetNest TMS'}</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                ${translations.content.automaticEmail}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { data, error } = await supabase.functions.invoke('send-payment-report', {
        body: {
          to: driver.display_email,
          subject: interpolateText(translations.subject, variables),
          html: emailHTML,
          pdf_data: pdfArray,
          pdf_filename: `PaymentReport_${reportData.driver.name.replace(/\s+/g, '_')}_${formatDateSafe(reportData.period.end_date, "yyyy/'W'ww").replace(/\//g, '-')}.pdf`
        }
      });

      if (error) throw error;

      showSuccess(t('report_dialog.messages.email_sent'), `${t('report_dialog.messages.email_success')} ${driver.display_email}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      showError(t('actions.error'), t('report_dialog.messages.email_error'));
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
            <DialogTitle>
              {t('report_dialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('report_dialog.loading')}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="text-center py-8">
            {isLoading ? t('report_dialog.loading') : t('reports.no_reports')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    );
  }

  return (
    <>
      {pdfUrl ? (
        // Vista del PDF en iframe
        <Dialog open={open} onOpenChange={(newOpen) => {
          if (!newOpen) {
            // Limpiar PDF URL cuando se cierra
            if (pdfUrl) {
              URL.revokeObjectURL(pdfUrl);
              setPdfUrl(null);
            }
          }
          onOpenChange(newOpen);
        }}>
          <DialogContent className="w-[95vw] max-w-none sm:max-w-6xl h-[95vh] sm:max-h-[95vh] overflow-hidden flex flex-col p-0">
            <div className="p-4 border-b shrink-0 flex items-start justify-between pr-12">
              <div className="flex-1 mr-4">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('report_dialog.title')} - {driver.display_name || `${driver.first_name} ${driver.last_name}`}
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {t('period.period_label')}: {(calculation as any).period?.period_start_date && (calculation as any).period?.period_end_date
                    ? (() => {
                        const startDate = (calculation as any).period.period_start_date;
                        const endDate = (calculation as any).period.period_end_date;
                        const weekNumber = calculateWeekNumberFromString(startDate);
                        const year = startDate.split('-')[0];
                        const formattedDates = formatPaymentPeriod(startDate, endDate);
                        return `Wk${weekNumber}/${year} (${formattedDates})`;
                      })()
                    : 'N/A'}
                </DialogDescription>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (pdfUrl) {
                      URL.revokeObjectURL(pdfUrl);
                      setPdfUrl(null);
                    }
                  }}
                  className="mt-2"
                >
                  Volver al Reporte
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
                sandbox="allow-same-origin allow-scripts allow-downloads"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        // Vista normal del reporte
        <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none sm:max-w-4xl h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-lg">
        {/* Header fijo */}
        <div className="p-4 sm:p-6 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 min-w-0 text-base sm:text-lg">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {t('report_dialog.title')} - {driver.display_name || `${driver.first_name} ${driver.last_name}`}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words mt-1">
              {t('period.period_label')}: {(() => {
                const startDate = (calculation as any).period?.period_start_date;
                const endDate = (calculation as any).period?.period_end_date;
                if (!startDate || !endDate) return 'N/A';
                const weekNumber = calculateWeekNumberFromString(startDate);
                const year = startDate.split('-')[0];
                const formattedDates = formatPaymentPeriod(startDate, endDate);
                return `Wk${weekNumber}/${year} (${formattedDates})`;
              })()}
              {calculation.payment_date && (
                  <span className="block text-primary font-medium mt-1">
                    {t('report_dialog.fuel_details.date')}: {formatDateAuto(calculation.payment_date)}
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
                {t('report_dialog.financial_summary')}
              </CardTitle>
              {calculation.has_negative_balance && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('report_dialog.negative_balance_warning', 'Negative balance detected')}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('report_dialog.gross_earnings')}</span>
                  </span>
                  <span className="font-semibold text-xs sm:text-sm">
                    {formatCurrency(calculation.gross_earnings)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('report_dialog.other_income')}</span>
                  </span>
                  <span className="font-semibold text-success text-xs sm:text-sm">
                    {formatCurrency(calculation.other_income)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Receipt className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('report_dialog.deductions_section')}</span>
                  </span>
                  <span className="font-semibold text-destructive text-xs sm:text-sm">
                    -{formatCurrency(calculation.total_deductions)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Fuel className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('report_dialog.fuel_expenses')}</span>
                  </span>
                  <span className="font-semibold text-warning text-xs sm:text-sm">
                    -{formatCurrency(calculation.fuel_expenses)}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-base sm:text-lg font-bold">
                <span>{t('report_dialog.net_payment')}:</span>
                <span className={calculateNetPayment(calculation) >= 0 ? 'text-success' : 'text-destructive'}>
                  {formatCurrency(calculateNetPayment(calculation))}
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
                  {t('report_dialog.loads_period_title')} ({loads.length} - {t('report_dialog.loads_total')}: {formatCurrency(loads.reduce((sum, load) => sum + load.total_amount, 0))})
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
                              let clientName = t('report_dialog.load_details.client');
                              
                              if (clientData) {
                                if (clientData.alias && clientData.alias.trim()) {
                                  clientName = clientData.alias;
                                } else if (clientData.name && clientData.name.trim()) {
                                  clientName = clientData.name;
                                }
                              }
                              
                              return clientName;
                            })()}
                          </div>
                        </div>
                      </div>
                      
                       {/* Segunda línea: Porcentajes + Monto + Botón Editar */}
                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                         <div className="flex flex-wrap gap-2">
                           {(load.dispatching_percentage > 0 || load.factoring_percentage > 0 || load.leasing_percentage > 0) ? (
                             <>
                               {load.dispatching_percentage > 0 && (
                                 <Badge variant="outline" className="text-xs">
                    {t('report_dialog.load_details.percentages.dispatching')}: {load.dispatching_percentage}% ({formatCurrency((load.total_amount * load.dispatching_percentage) / 100)})
                                 </Badge>
                               )}
                               {load.factoring_percentage > 0 && (
                                 <Badge variant="outline" className="text-xs">
                                   {t('report_dialog.load_details.percentages.factoring')}: {load.factoring_percentage}% ({formatCurrency((load.total_amount * load.factoring_percentage) / 100)})
                                 </Badge>
                               )}
                               {load.leasing_percentage > 0 && (
                                 <Badge variant="outline" className="text-xs">
                                   {t('report_dialog.load_details.percentages.leasing')}: {load.leasing_percentage}% ({formatCurrency((load.total_amount * load.leasing_percentage) / 100)})
                                 </Badge>
                               )}
                             </>
                           ) : (
                             <span className="text-xs text-muted-foreground">{t('report_dialog.load_details.percentages.none_applied')}</span>
                           )}
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="font-semibold sm:text-right shrink-0 text-sm sm:text-base">
                             {formatCurrency(load.total_amount)}
                           </div>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               setSelectedLoadForEdit(load);
                               setShowEditLoadDialog(true);
                             }}
                             className="h-7 w-7 p-0"
                             title={t('common.edit')}
                           >
                             <Edit className="h-3 w-3" />
                           </Button>
                         </div>
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
                  {t('report_dialog.deductions_section')} ({deductions.length} - {t('report_dialog.loads_total')}: {formatCurrency(deductions.reduce((sum, deduction) => sum + deduction.amount, 0))})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="font-medium truncate text-sm sm:text-base">{deduction.expense_types?.name || deduction.description}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatDateAuto(deduction.expense_date)} • {deduction.status === 'planned' ? t('report_dialog.deduction_details.status.planned') : t('report_dialog.deduction_details.status.applied')}
                        </div>
                      </div>
                      <div className="font-semibold text-destructive sm:text-right shrink-0 text-sm sm:text-base">
                        -{formatCurrency(deduction.amount)}
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
                  {t('report_dialog.fuel_expenses')} ({fuelExpenses.length} - {t('report_dialog.loads_total')}: {formatCurrency(fuelExpenses.reduce((sum, expense) => sum + expense.total_amount, 0))})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fuelExpenses.map((expense) => (
                    <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b">
                       <div className="space-y-1 min-w-0 flex-1">
                         <div className="font-medium truncate text-sm sm:text-base">
                           {expense.station_name || t('deductions.status.station')}
                         </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {expense.gallons_purchased} gal • {formatDateSafe(expense.transaction_date)}
                            {(expense.station_city || expense.station_state) && (
                             <span className="ml-2">
                               • {expense.station_city && expense.station_state 
                                 ? `${expense.station_city}, ${expense.station_state}`
                                 : expense.station_city || expense.station_state
                               }
                             </span>
                           )}
                         </div>
                       </div>
                      <div className="font-semibold text-warning sm:text-right shrink-0 text-sm sm:text-base">
                        {formatCurrency(expense.total_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Otros Ingresos */}
          {calculation.other_income > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  {t('report_dialog.other_income_section')} (1 - {t('report_dialog.loads_total')}: {formatCurrency(calculation.other_income)})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">{t('income.other')}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {t('reports.company_name')}
                      </div>
                    </div>
                    <div className="font-semibold text-success sm:text-right shrink-0 text-sm sm:text-base">
                      {formatCurrency(calculation.other_income)}
                    </div>
                  </div>
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
              <span className="truncate">{isGeneratingPDF ? t('report_dialog.actions.generating') : t('report_dialog.actions.preview')}</span>
            </Button>
            <Button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              size="sm"
              className="w-full sm:flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="truncate">{isGeneratingPDF ? t('report_dialog.actions.generating') : t('report_dialog.actions.download')}</span>
            </Button>
            <Button 
              variant="outline"
              onClick={handleEmailButtonClick}
              disabled={isSendingEmail}
              size="sm"
              className={`w-full sm:flex-1 transition-all duration-200 ${
                isSendingEmail 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed' 
                  : 'hover:bg-blue-50 hover:border-blue-200'
              }`}
            >
              {isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600 mr-2"></div>
                  <span className="truncate">{t('report_dialog.actions.sending')}</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="truncate">{t('report_dialog.actions.email')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
        </DialogContent>
        </Dialog>
      )}
      
      <EmailConfirmationDialog
        open={showEmailConfirm}
        onOpenChange={setShowEmailConfirm}
        onConfirm={handleConfirmSendEmail}
        recipientEmail={driver?.display_email || ''}
        driverName={driver?.display_name || `${driver?.first_name} ${driver?.last_name}`}
        isSending={isSendingEmail}
      />

      <CreateLoadDialog
        isOpen={showEditLoadDialog}
        onClose={() => {
          setShowEditLoadDialog(false);
          setSelectedLoadForEdit(null);
          // Refrescar los datos después de editar
          queryClient.invalidateQueries({ queryKey: ['period-loads'] });
          queryClient.invalidateQueries({ queryKey: ['payment-calculation-detail'] });
        }}
        mode="edit"
        loadData={selectedLoadForEdit}
      />
    </>
  );
}