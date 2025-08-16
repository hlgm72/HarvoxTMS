import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  "https://htaotttcnjxqzpsrqwll.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.mSGdCUhKfKlE_gJ45lBjh9tZq-k4tHU25dJMLdPTU74"
);

serve(async (req) => {
  console.log('Payment report email function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { driver_user_id, period_id, company_name } = await req.json();
    console.log('Request data:', { driver_user_id, period_id, company_name });

    if (!driver_user_id || !period_id) {
      throw new Error('driver_user_id and period_id are required');
    }

    // Get driver calculation data
    const { data: calculation, error: calcError } = await supabase
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
      .eq('id', period_id)
      .single();

    if (calcError || !calculation) {
      console.error('Error fetching calculation:', calcError);
      throw new Error('Payment calculation not found');
    }

    // Get driver profile info
    const { data: driverProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, phone, street_address, zip_code, state_id, city')
      .eq('user_id', driver_user_id)
      .single();

    if (profileError) {
      console.error('Error fetching driver profile:', profileError);
      throw new Error('Driver profile not found');
    }

    // Get driver email
    const { data: emailData, error: emailError } = await supabase
      .rpc('get_user_email_by_id', { user_id_param: driver_user_id });

    if (emailError || !emailData) {
      console.error('Error fetching driver email:', emailError);
      throw new Error('Driver email not found');
    }

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, street_address, zip_code, state_id, city, phone, email, logo_url')
      .eq('id', calculation.company_payment_periods.company_id)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      throw new Error('Company information not found');
    }

    // Get loads for the period
    const { data: loads, error: loadsError } = await supabase
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
        load_stops(stop_type, company_name, city, state)
      `)
      .eq('driver_user_id', driver_user_id)
      .gte('pickup_date', calculation.company_payment_periods.period_start_date)
      .lte('delivery_date', calculation.company_payment_periods.period_end_date)
      .order('pickup_date', { ascending: true });

    if (loadsError) {
      console.error('Error fetching loads:', loadsError);
    }

    // Get deductions for the period
    const { data: deductions, error: deductionsError } = await supabase
      .from('expense_instances')
      .select(`
        id,
        amount,
        description,
        expense_date,
        status,
        expense_types(name, category)
      `)
      .eq('payment_period_id', period_id)
      .in('status', ['applied', 'planned'])
      .order('expense_date', { ascending: true });

    if (deductionsError) {
      console.error('Error fetching deductions:', deductionsError);
    }

    // Get fuel expenses for the period
    const { data: fuelExpenses, error: fuelError } = await supabase
      .from('fuel_expenses')
      .select('*')
      .eq('driver_user_id', driver_user_id)
      .eq('payment_period_id', calculation.company_payment_period_id)
      .order('transaction_date', { ascending: true });

    if (fuelError) {
      console.error('Error fetching fuel expenses:', fuelError);
    }

    // Format period dates
    const periodStart = new Date(calculation.company_payment_periods.period_start_date).toLocaleDateString('en-US');
    const periodEnd = new Date(calculation.company_payment_periods.period_end_date).toLocaleDateString('en-US');
    const paymentDate = calculation.company_payment_periods.payment_date 
      ? new Date(calculation.company_payment_periods.payment_date).toLocaleDateString('en-US')
      : 'TBD';

    // Format currency
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);

    // Create loads summary
    const loadsCount = loads?.length || 0;
    const loadsHTML = loads?.map(load => {
      const pickup = load.load_stops?.find(stop => stop.stop_type === 'pickup');
      const delivery = load.load_stops?.find(stop => stop.stop_type === 'delivery');
      
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; border: 1px solid #ddd;">${load.load_number}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${load.po_number || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${pickup ? `${pickup.city}, ${pickup.state}` : '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${delivery ? `${delivery.city}, ${delivery.state}` : '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(load.total_amount)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5" style="padding: 8px; text-align: center;">No loads found</td></tr>';

    // Create deductions summary
    const deductionsHTML = deductions?.map(deduction => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; border: 1px solid #ddd;">${deduction.expense_types?.name || 'Other'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${deduction.description || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(deduction.amount)}</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="padding: 8px; text-align: center;">No deductions</td></tr>';

    // Create fuel expenses summary
    const fuelHTML = fuelExpenses?.map(fuel => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(fuel.transaction_date).toLocaleDateString('en-US')}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${fuel.station_name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${fuel.gallons_purchased || 0} gal</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(fuel.total_amount)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding: 8px; text-align: center;">No fuel expenses</td></tr>';

    // Create HTML email content
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Report - ${driverProfile.first_name} ${driverProfile.last_name}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 10px 0;">Payment Report</h1>
          <h2 style="color: #475569; margin: 0; font-size: 18px;">${company.name}</h2>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Driver Information</h3>
          <p><strong>Name:</strong> ${driverProfile.first_name} ${driverProfile.last_name}</p>
          <p><strong>Email:</strong> ${emailData}</p>
          <p><strong>Period:</strong> ${periodStart} - ${periodEnd}</p>
          <p><strong>Payment Date:</strong> ${paymentDate}</p>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Payment Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; font-weight: bold;">Gross Earnings:</td>
              <td style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; text-align: right;">${formatCurrency(calculation.gross_earnings)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Other Income:</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(calculation.other_income)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; font-weight: bold;">Total Income:</td>
              <td style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(calculation.total_income)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Fuel Expenses:</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc2626;">-${formatCurrency(calculation.fuel_expenses)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; font-weight: bold;">Other Deductions:</td>
              <td style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; text-align: right; color: #dc2626;">-${formatCurrency(calculation.total_deductions)}</td>
            </tr>
            <tr style="background: #dcfce7; font-weight: bold; font-size: 16px;">
              <td style="padding: 15px; border: 2px solid #16a34a;">NET PAYMENT:</td>
              <td style="padding: 15px; border: 2px solid #16a34a; text-align: right; color: #16a34a;">${formatCurrency(calculation.net_payment)}</td>
            </tr>
          </table>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Loads Summary (${loadsCount} loads)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Load #</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">PO #</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Pickup</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Delivery</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${loadsHTML}
            </tbody>
          </table>
        </div>

        ${deductions?.length > 0 ? `
        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Deductions</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #fef2f2;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Type</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Description</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${deductionsHTML}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${fuelExpenses?.length > 0 ? `
        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Fuel Expenses</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #fffbeb;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Station</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Gallons</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${fuelHTML}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #64748b;">
          <p style="margin: 0 0 10px 0;"><strong>Company:</strong> ${company.name}</p>
          <p style="margin: 0 0 10px 0;"><strong>Address:</strong> ${company.street_address}, ${company.city}, ${company.state_id} ${company.zip_code}</p>
          <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${company.phone || 'N/A'}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${company.email || 'N/A'}</p>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af;">
          <p>This is an automated payment report generated by FleetNest.</p>
          <p>For questions or concerns, please contact your dispatch office.</p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: "FleetNest <noreply@fleetnest.app>",
      to: [emailData],
      subject: `Payment Report - ${periodStart} to ${periodEnd} - ${company.name}`,
      html: emailHTML,
    });

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error);
      throw new Error(`Failed to send email: ${emailResult.error.message}`);
    }

    console.log('Email sent successfully:', emailResult.data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment report email sent successfully',
      email_id: emailResult.data?.id,
      recipient: emailData,
      calculation_id: period_id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-payment-report:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});