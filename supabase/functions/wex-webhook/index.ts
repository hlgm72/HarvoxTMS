import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = "https://htaotttcnjxqzpsrqwll.supabase.co";
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('WEX Webhook received:', req.method, req.url);

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const webhookData = await req.json();
    console.log('WEX Webhook data:', JSON.stringify(webhookData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    // Process authorization data
    if (webhookData.authorization) {
      const auth = webhookData.authorization;
      
      console.log('Processing authorization:', {
        cardNumber: auth.cardNumber,
        amount: auth.amount,
        merchantName: auth.merchantName,
        authorizationDate: auth.authorizationDate
      });

      // Find the driver by card number or other identifier
      // Note: You'll need to establish how to link WEX cards to drivers
      let driverUserId = null;
      
      // For now, we'll try to find by card number in a hypothetical driver_cards table
      // You may need to create this table to map WEX cards to drivers
      const { data: driverCard } = await supabase
        .from('driver_cards')
        .select('driver_user_id')
        .eq('card_number', auth.cardNumber?.slice(-4)) // Last 4 digits for security
        .single();

      if (driverCard) {
        driverUserId = driverCard.driver_user_id;
      }

      // Get company_id from the driver
      let companyId = null;
      if (driverUserId) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', driverUserId)
          .eq('role', 'driver')
          .eq('is_active', true)
          .single();

        if (userRole) {
          companyId = userRole.company_id;
        }
      }

      // Create fuel expense record
      const fuelExpenseData = {
        driver_user_id: driverUserId,
        company_id: companyId,
        transaction_date: auth.authorizationDate || new Date().toISOString(),
        station_name: auth.merchantName || 'Unknown Station',
        total_amount: parseFloat(auth.amount) || 0,
        gallons_purchased: parseFloat(auth.quantity) || 0,
        price_per_gallon: auth.unitPrice ? parseFloat(auth.unitPrice) : null,
        card_last_four: auth.cardNumber?.slice(-4),
        authorization_code: auth.authorizationCode,
        transaction_id: auth.transactionId,
        status: auth.responseCode === '00' ? 'approved' : 'pending',
        wex_reference_id: auth.referenceNumber,
        raw_webhook_data: webhookData,
        created_at: new Date().toISOString()
      };

      console.log('Creating fuel expense:', fuelExpenseData);

      const { data: fuelExpense, error: insertError } = await supabase
        .from('fuel_expenses')
        .insert(fuelExpenseData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting fuel expense:', insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create fuel expense',
            details: insertError 
          }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Fuel expense created successfully:', fuelExpense.id);

      // Log the webhook reception for audit
      await supabase
        .from('system_stats')
        .insert({
          stat_type: 'wex_webhook_received',
          stat_value: {
            webhook_type: 'authorization',
            fuel_expense_id: fuelExpense.id,
            driver_user_id: driverUserId,
            company_id: companyId,
            amount: auth.amount,
            card_last_four: auth.cardNumber?.slice(-4),
            processed_at: new Date().toISOString()
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Authorization processed successfully',
          fuel_expense_id: fuelExpense.id 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle detailed authorization (if different structure)
    if (webhookData.detailedAuthorization) {
      console.log('Processing detailed authorization');
      // Similar processing for detailed authorization structure
    }

    // Handle transaction data
    if (webhookData.transaction) {
      console.log('Processing transaction data');
      // Process posted transaction (final settlement)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received but no recognized data structure' 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing WEX webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});