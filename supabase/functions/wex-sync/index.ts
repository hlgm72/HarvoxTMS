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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const wexUsername = Deno.env.get('WEX_API_USERNAME');
    const wexPassword = Deno.env.get('WEX_API_PASSWORD');

    if (!wexUsername || !wexPassword) {
      throw new Error('WEX API credentials not configured');
    }

    const { action, dateFrom, dateTo, cardLastFour } = await req.json();
    
    console.log('WEX Sync request:', { action, dateFrom, dateTo, cardLastFour });

    if (action === 'sync_transactions') {
      // Create basic auth header for WEX API
      const authString = btoa(`${wexUsername}:${wexPassword}`);
      
      // WEX API endpoint for transaction history
      // Note: This is a simplified example - actual WEX API endpoints may vary
      const wexApiUrl = 'https://api.wexinc.com/fleet/v1/transactions';
      
      const queryParams = new URLSearchParams({
        startDate: dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: dateTo || new Date().toISOString().split('T')[0],
        ...(cardLastFour && { cardMask: `****${cardLastFour}` })
      });

      console.log('Querying WEX API:', `${wexApiUrl}?${queryParams}`);

      const wexResponse = await fetch(`${wexApiUrl}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!wexResponse.ok) {
        const errorText = await wexResponse.text();
        console.error('WEX API Error:', wexResponse.status, errorText);
        throw new Error(`WEX API Error: ${wexResponse.status} - ${errorText}`);
      }

      const wexData = await wexResponse.json();
      console.log('WEX API Response:', wexData);

      let syncedCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Process each transaction from WEX
      if (wexData.transactions && Array.isArray(wexData.transactions)) {
        for (const transaction of wexData.transactions) {
          try {
            // Check if transaction already exists
            const { data: existingTransaction } = await supabaseClient
              .from('fuel_expenses')
              .select('id')
              .eq('wex_reference_id', transaction.transactionId)
              .maybeSingle();

            if (existingTransaction) {
              skippedCount++;
              continue;
            }

            // Find driver by card number
            const cardLastFour = transaction.cardNumber?.slice(-4);
            if (!cardLastFour) {
              console.log('Transaction missing card number:', transaction.transactionId);
              continue;
            }

            const { data: driverCard } = await supabaseClient
              .from('driver_cards')
              .select('driver_user_id, company_id')
              .eq('card_number_last_four', cardLastFour)
              .eq('is_active', true)
              .maybeSingle();

            if (!driverCard) {
              console.log('No driver found for card:', cardLastFour);
              continue;
            }

            // Get or create payment period
            const transactionDate = new Date(transaction.transactionDate);
            const { data: paymentPeriod } = await supabaseClient
              .from('company_payment_periods')
              .select('id')
              .eq('company_id', driverCard.company_id)
              .lte('period_start_date', transactionDate.toISOString().split('T')[0])
              .gte('period_end_date', transactionDate.toISOString().split('T')[0])
              .eq('status', 'open')
              .maybeSingle();

            if (!paymentPeriod) {
              console.log('No open payment period found for transaction date:', transactionDate);
              continue;
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
                  total_income: 0,
                  net_payment: 0,
                  has_negative_balance: false
                })
                .select('id')
                .single();

              driverCalculationId = newCalc.id;
            }

            // Create fuel expense record
            const { error: insertError } = await supabaseClient
              .from('fuel_expenses')
              .insert({
                driver_user_id: driverCard.driver_user_id,
                payment_period_id: driverCalculationId,
                transaction_date: transactionDate.toISOString(),
                total_amount: parseFloat(transaction.amount),
                gallons_purchased: parseFloat(transaction.gallons || '0'),
                price_per_gallon: parseFloat(transaction.pricePerGallon || '0'),
                station_name: transaction.merchantName,
                station_address: transaction.merchantAddress,
                fuel_type: transaction.fuelType || 'diesel',
                card_last_four: cardLastFour,
                wex_reference_id: transaction.transactionId,
                authorization_code: transaction.authorizationCode,
                status: 'approved',
                raw_webhook_data: transaction,
                notes: 'Synced from WEX API'
              });

            if (insertError) {
              console.error('Error inserting fuel expense:', insertError);
              errors.push(`Transaction ${transaction.transactionId}: ${insertError.message}`);
            } else {
              syncedCount++;
              console.log('Synced transaction:', transaction.transactionId);
            }

          } catch (error) {
            console.error('Error processing transaction:', transaction.transactionId, error);
            errors.push(`Transaction ${transaction.transactionId}: ${error.message}`);
          }
        }
      }

      // Log sync statistics
      await supabaseClient
        .from('system_stats')
        .insert({
          stat_type: 'wex_api_sync',
          stat_value: {
            synced_count: syncedCount,
            skipped_count: skippedCount,
            total_transactions: wexData.transactions?.length || 0,
            errors: errors,
            sync_date: new Date().toISOString(),
            date_range: { from: dateFrom, to: dateTo }
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          synced: syncedCount,
          skipped: skippedCount,
          total: wexData.transactions?.length || 0,
          errors: errors.length > 0 ? errors : undefined
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in wex-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});