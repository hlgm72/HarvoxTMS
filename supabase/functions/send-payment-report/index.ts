import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from 'npm:resend@4.6.0';

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
    console.log('Starting send-payment-report function');
    
    const { driver_user_id, period_id, company_name }: PaymentReportRequest = await req.json();
    console.log('Request data:', { driver_user_id, period_id, company_name });

    // Obtener información del conductor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', driver_user_id)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Driver profile not found');
    }

    // Obtener email del usuario usando función RPC
    const { data: email, error: emailError } = await supabase
      .rpc('get_user_email_by_id', { user_id_param: driver_user_id });

    console.log('Email query result:', { email, emailError });

    if (emailError || !email) {
      console.error('Email error:', emailError);
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
      console.error('Calculation error:', calcError);
      throw new Error('Payment period calculation not found');
    }

    console.log('Calculation found:', calculation);

    // Crear HTML simple para el email
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Reporte de Pago</h1>
            <h2>Conductor: ${profile.first_name} ${profile.last_name}</h2>
            <h3>Empresa: ${company_name || 'Tu Empresa'}</h3>
            <p><strong>Período:</strong> ${calculation.company_payment_periods.period_start_date} al ${calculation.company_payment_periods.period_end_date}</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Resumen Financiero</h3>
              <p><strong>Ingresos Brutos:</strong> $${calculation.gross_earnings}</p>
              <p><strong>Gastos de Combustible:</strong> $${calculation.fuel_expenses}</p>
              <p><strong>Otros Ingresos:</strong> $${calculation.other_income}</p>
              <p><strong>Total Deducciones:</strong> $${calculation.total_deductions}</p>
              <hr style="margin: 15px 0;">
              <p style="font-size: 18px;"><strong>Pago Neto:</strong> $${calculation.net_payment}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Este es un reporte automatizado del sistema de gestión de flotillas.
            </p>
          </div>
        </body>
      </html>
    `;

    console.log('Sending email to hlgm72@gmail.com');

    // Enviar email - TEMPORAL: enviando a email de prueba
    const { error: emailSendError } = await resend.emails.send({
      from: 'Reportes de Pago <noreply@tuempresa.com>',
      to: ['hlgm72@gmail.com'], // EMAIL TEMPORAL PARA PRUEBAS
      subject: `Reporte de Pago - ${calculation.company_payment_periods.period_start_date} al ${calculation.company_payment_periods.period_end_date}`,
      html: emailHtml,
    });

    if (emailSendError) {
      console.error('Resend error:', emailSendError);
      throw emailSendError;
    }

    console.log('Email sent successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment report sent successfully',
      sent_to: 'hlgm72@gmail.com'
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