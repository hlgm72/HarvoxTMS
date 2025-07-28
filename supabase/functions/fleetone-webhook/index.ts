import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log('FleetOne webhook received:', requestData);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process FleetOne webhook data
    // FleetOne might send different structures than WEX
    const transactionData = requestData.transaction || requestData.data || requestData;
    
    if (transactionData) {
      console.log('Processing FleetOne transaction:', transactionData);

      // Extract card information (FleetOne format)
      const cardNumber = transactionData.card_number || 
                        transactionData.cardNumber || 
                        transactionData.card;
      const cardLastFour = cardNumber?.slice(-4);

      if (!cardLastFour) {
        console.log('No card number found in FleetOne webhook');
        return new Response(JSON.stringify({ success: false, error: 'No card number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find driver by card number
      const { data: driverCard, error: cardError } = await supabaseClient
        .from('driver_cards')
        .select('driver_user_id, company_id')
        .eq('card_number_last_four', cardLastFour)
        .eq('card_provider', 'fleetone')
        .eq('is_active', true)
        .maybeSingle();

      if (cardError || !driverCard) {
        console.log('No FleetOne driver card found for:', cardLastFour);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Driver card not found or not FleetOne card' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get or create payment period
      const transactionDate = new Date(
        transactionData.transaction_date || 
        transactionData.date || 
        transactionData.transactionDate ||
        new Date()
      );
      
      const { data: paymentPeriod } = await supabaseClient
        .from('company_payment_periods')
        .select('id')
        .eq('company_id', driverCard.company_id)
        .lte('period_start_date', transactionDate.toISOString().split('T')[0])
        .gte('period_end_date', transactionDate.toISOString().split('T')[0])
        .eq('status', 'open')
        .maybeSingle();

      if (!paymentPeriod) {
        console.log('No open payment period found for FleetOne transaction');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No open payment period' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create driver period calculation if needed
      const { data: driverCalc } = await supabaseClient
        .from('driver_period_calculations')
        .select('id')
        .eq('company_payment_period_id', paymentPeriod.id)
        .eq('driver_user_id', driverCard.driver_user_id)
        .maybeSingle();

      let driverCalculationId = driverCalc?.id;

      if (!driverCalculationId) {
        const { data: newCalc } = await supabaseClient
          .from('driver_period_calculations')
          .insert({
            company_payment_period_id: paymentPeriod.id,
            driver_user_id: driverCard.driver_user_id,
            gross_earnings: 0,
            total_deductions: 0,
            other_income: 0,
            // total_income eliminado - se calcula dinámicamente
            net_payment: 0,
            has_negative_balance: false
          })
          .select('id')
          .single();

        driverCalculationId = newCalc.id;
      }

      // Create fuel expense record
      const { data: fuelExpense, error: insertError } = await supabaseClient
        .from('fuel_expenses')
        .insert({
          driver_user_id: driverCard.driver_user_id,
          payment_period_id: driverCalculationId,
          transaction_date: transactionDate.toISOString(),
          total_amount: parseFloat(transactionData.amount || transactionData.total_amount || '0'),
          gallons_purchased: parseFloat(transactionData.gallons || transactionData.quantity || '0'),
          price_per_gallon: parseFloat(transactionData.price_per_gallon || transactionData.unit_price || '0'),
          station_name: transactionData.merchant_name || transactionData.merchantName || transactionData.station,
          station_address: transactionData.merchant_address || transactionData.merchantAddress || transactionData.location,
          fuel_type: transactionData.fuel_type || transactionData.fuelType || 'diesel',
          card_last_four: cardLastFour,
          wex_reference_id: transactionData.transaction_id || transactionData.id || transactionData.transactionId,
          authorization_code: transactionData.authorization_code || transactionData.authCode,
          status: 'pending',
          raw_webhook_data: transactionData,
          notes: 'Created from FleetOne webhook'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating FleetOne fuel expense:', insertError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: insertError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log webhook processing
      await supabaseClient
        .from('system_stats')
        .insert({
          stat_type: 'fleetone_webhook_processed',
          stat_value: {
            fuel_expense_id: fuelExpense.id,
            driver_user_id: driverCard.driver_user_id,
            transaction_date: transactionDate.toISOString(),
            amount: transactionData.amount,
            processed_at: new Date().toISOString()
          }
        });

      console.log('FleetOne webhook processed successfully:', fuelExpense.id);

      return new Response(JSON.stringify({ 
        success: true, 
        fuel_expense_id: fuelExpense.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'No transaction data found' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in FleetOne webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});