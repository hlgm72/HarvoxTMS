import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3"
import { Resend } from "npm:resend@2.0.0"
import jsPDF from "npm:jspdf@2.5.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Crear cliente Supabase
const supabase = createClient(
  "https://htaotttcnjxqzpsrqwll.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.mSGdCUhKfKlE_gJ45lBjh9tZq-k4tHU25dJMLdPTU74"
)

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface PaymentReportRequest {
  driver_user_id: string
  period_id: string
  company_name: string
}

// Función para formatear fechas de manera segura
function formatDateSafe(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

// Función para generar PDF simplificada
function generatePaymentReportPDF(data: any): Uint8Array {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 12;
  let currentY = margin;

  // Header del reporte
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Report', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Información del conductor
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Driver: ${data.driver.name}`, margin, currentY);
  currentY += 8;
  
  // Período
  doc.text(`Period: ${formatDateSafe(data.period.start_date)} - ${formatDateSafe(data.period.end_date)}`, margin, currentY);
  currentY += 8;

  // Compañía
  doc.text(`Company: ${data.company.name}`, margin, currentY);
  currentY += 15;

  // Resumen financiero
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Summary:', margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Gross Earnings: $${data.period.gross_earnings.toFixed(2)}`, margin, currentY);
  currentY += 6;
  doc.text(`Other Income: $${data.period.other_income.toFixed(2)}`, margin, currentY);
  currentY += 6;
  doc.text(`Total Deductions: $${data.period.total_deductions.toFixed(2)}`, margin, currentY);
  currentY += 6;
  doc.text(`Fuel Expenses: $${data.period.fuel_expenses.toFixed(2)}`, margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text(`Net Payment: $${data.period.net_payment.toFixed(2)}`, margin, currentY);

  return doc.output('arraybuffer');
}

serve(async (req) => {
  console.log('=== Payment report function started ===')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    console.log('Processing POST request...')
    const { driver_user_id, period_id, company_name }: PaymentReportRequest = await req.json()
    
    console.log('Request body received:', { driver_user_id, period_id, company_name })

    // Obtener datos del cálculo del conductor
    console.log('Fetching driver calculation data...')
    const { data: calculation, error: calcError } = await supabase
      .from('driver_period_calculations')
      .select(`
        *,
        company_payment_periods!inner(
          period_start_date,
          period_end_date,
          payment_date,
          company_id
        )
      `)
      .eq('id', period_id)
      .eq('driver_user_id', driver_user_id)
      .single()

    if (calcError || !calculation) {
      console.error('Error fetching calculation:', calcError)
      throw new Error('No se pudo obtener el cálculo del período')
    }

    // Obtener información del conductor
    console.log('Fetching driver profile...')
    const { data: driverData } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', driver_user_id)
      .single()

    // Obtener email del conductor
    console.log('Fetching driver email...')
    const { data: emailData } = await supabase
      .rpc('get_user_email_by_id', { user_id_param: driver_user_id })

    const driverEmail = emailData || 'hlgm72@gmail.com'
    
    // Preparar datos para el PDF
    const reportData = {
      driver: {
        name: driverData?.driver_id || 'Unknown Driver',
        user_id: driver_user_id,
        email: driverEmail
      },
      period: {
        start_date: calculation.company_payment_periods.period_start_date,
        end_date: calculation.company_payment_periods.period_end_date,
        gross_earnings: calculation.gross_earnings || 0,
        fuel_expenses: calculation.fuel_expenses || 0,
        total_deductions: calculation.total_deductions || 0,
        other_income: calculation.other_income || 0,
        net_payment: calculation.net_payment || 0,
        payment_date: calculation.company_payment_periods.payment_date
      },
      company: {
        name: company_name
      }
    }

    console.log('Generating PDF...')
    const pdfBuffer = generatePaymentReportPDF(reportData)

    console.log('Sending email with PDF attachment...')
    const emailResult = await resend.emails.send({
      from: "FleetNest <noreply@fleetnest.app>",
      to: ["hlgm72@gmail.com"],
      subject: `Payment Report - ${reportData.driver.name} - ${formatDateSafe(reportData.period.start_date)}`,
      html: `
        <h2>Payment Report</h2>
        <p>Dear ${reportData.driver.name},</p>
        <p>Please find attached your payment report for the period from ${formatDateSafe(reportData.period.start_date)} to ${formatDateSafe(reportData.period.end_date)}.</p>
        <p><strong>Net Payment: $${reportData.period.net_payment.toFixed(2)}</strong></p>
        <p>If you have any questions, please contact your dispatcher.</p>
        <br>
        <p>Best regards,<br>${company_name}</p>
      `,
      attachments: [
        {
          filename: `PaymentReport_${reportData.driver.name.replace(/\s+/g, '_')}_${formatDateSafe(reportData.period.start_date).replace(/\//g, '-')}.pdf`,
          content: Array.from(new Uint8Array(pdfBuffer))
        }
      ]
    })

    if (emailResult.error) {
      console.error('Email send error:', emailResult.error)
      throw new Error(`Failed to send email: ${emailResult.error.message}`)
    }

    console.log('Email sent successfully:', emailResult.data?.id)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment report sent successfully',
      email_id: emailResult.data?.id,
      recipient: 'hlgm72@gmail.com'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})