import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from 'npm:resend@4.6.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { PaymentReportEmail } from './_templates/payment-report-email.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentReportRequest {
  driver_user_id: string;
  period_id: string;
  company_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { driver_user_id, period_id, company_name }: PaymentReportRequest = await req.json();

    // Obtener información del conductor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', driver_user_id)
      .single();

    if (profileError || !profile) {
      throw new Error('Driver profile not found');
    }

    if (!profile.email) {
      throw new Error('Driver email not found');
    }

    // Obtener datos del período de pago
    const { data: calculation, error: calcError } = await supabase
      .from('driver_period_calculations')
      .select(`
        *,
        company_payment_periods!inner(
          period_start_date,
          period_end_date,
          company_id
        )
      `)
      .eq('id', period_id)
      .single();

    if (calcError || !calculation) {
      throw new Error('Payment period calculation not found');
    }

    // Generar contenido del email
    const emailData = {
      driverName: `${profile.first_name} ${profile.last_name}`,
      companyName: company_name || 'Tu Empresa',
      periodStart: calculation.company_payment_periods.period_start_date,
      periodEnd: calculation.company_payment_periods.period_end_date,
      grossEarnings: calculation.gross_earnings,
      fuelExpenses: calculation.fuel_expenses,
      totalDeductions: calculation.total_deductions,
      otherIncome: calculation.other_income,
      netPayment: calculation.net_payment,
      hasNegativeBalance: calculation.has_negative_balance,
      reportUrl: `${Deno.env.get('SITE_URL')}/payment-reports?period=${period_id}`
    };

    const html = await renderAsync(
      React.createElement(PaymentReportEmail, emailData)
    );

    // Enviar email - TEMPORAL: enviando a email de prueba
    const { error: emailError } = await resend.emails.send({
      from: 'Reportes de Pago <noreply@tuempresa.com>',
      to: ['hlgm72@gmail.com'], // EMAIL TEMPORAL PARA PRUEBAS
      subject: `Reporte de Pago - ${emailData.periodStart} al ${emailData.periodEnd}`,
      html,
    });

    if (emailError) {
      throw emailError;
    }

    // Registrar el envío (opcional)
    // await supabase
    //   .from('payment_report_logs')
    //   .insert({
    //     driver_user_id,
    //     period_id,
    //     sent_at: new Date().toISOString(),
    //     sent_to: profile.email
    //   });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment report sent successfully',
      sent_to: profile.email
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error sending payment report:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});