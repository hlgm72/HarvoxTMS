import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3"
import { Resend } from "npm:resend@2.0.0"

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
      .eq('company_payment_period_id', period_id)
      .eq('driver_user_id', driver_user_id)
      .single()

    if (calcError || !calculation) {
      console.error('Error fetching calculation:', calcError)
      throw new Error(`No se pudo obtener el cálculo del período: ${calcError?.message || 'No data found'}`)
    }

    console.log('Calculation found:', JSON.stringify(calculation))

    // Obtener información del conductor
    console.log('Fetching driver profile...')
    const { data: driverData } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', driver_user_id)
      .single()

    console.log('Driver profile:', JSON.stringify(driverData))

    // Obtener email del conductor
    console.log('Fetching driver email...')
    const driverEmail = await supabase.rpc('get_user_email_by_id', { 
      user_id_param: driver_user_id 
    })
    
    console.log('Driver email result:', driverEmail)

    // Preparar datos para el reporte
    const reportData = {
      driver: {
        name: driverData?.driver_id || 'Unknown Driver',
        user_id: driver_user_id,
        email: driverEmail.data || 'hlgm72@gmail.com'
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

    console.log('Report data prepared:', JSON.stringify(reportData))

    // Crear contenido HTML simple para el email
    const htmlContent = `
      <h2>Payment Report</h2>
      <p>Dear ${reportData.driver.name},</p>
      <p>Your payment report for the period from ${formatDateSafe(reportData.period.start_date)} to ${formatDateSafe(reportData.period.end_date)}:</p>
      
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background-color: #f2f2f2;">
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Gross Earnings</td>
          <td style="border: 1px solid #ddd; padding: 8px;">$${reportData.period.gross_earnings.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Other Income</td>
          <td style="border: 1px solid #ddd; padding: 8px;">$${reportData.period.other_income.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Total Deductions</td>
          <td style="border: 1px solid #ddd; padding: 8px;">-$${reportData.period.total_deductions.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Fuel Expenses</td>
          <td style="border: 1px solid #ddd; padding: 8px;">-$${reportData.period.fuel_expenses.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #e6f3ff; font-weight: bold;">
          <td style="border: 1px solid #ddd; padding: 8px;">Net Payment</td>
          <td style="border: 1px solid #ddd; padding: 8px;">$${reportData.period.net_payment.toFixed(2)}</td>
        </tr>
      </table>
      
      <p>If you have any questions, please contact your dispatcher.</p>
      <br>
      <p>Best regards,<br>${company_name}</p>
    `;

    console.log('Sending email...')
    const emailResult = await resend.emails.send({
      from: "FleetNest <noreply@fleetnest.app>",
      to: ["hlgm72@gmail.com"],
      subject: `Payment Report - ${reportData.driver.name} - ${formatDateSafe(reportData.period.start_date)}`,
      html: htmlContent
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