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

    const fleetOneClientId = Deno.env.get('FLEETONE_API_CLIENT_ID');
    const fleetOneClientSecret = Deno.env.get('FLEETONE_API_CLIENT_SECRET');

    if (!fleetOneClientId || !fleetOneClientSecret) {
      throw new Error('FleetOne API credentials not configured');
    }

    const { action, dateFrom, dateTo, cardLastFour } = await req.json();
    
    console.log('FleetOne Sync request:', { action, dateFrom, dateTo, cardLastFour });

    if (action === 'sync_transactions') {
      console.log('Starting FleetOne API authentication...');
      
      // First, get an access token from FleetOne
      let accessToken = null;
      
      try {
        const tokenResponse = await fetch('https://api.fleetone.com/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': fleetOneClientId,
            'client_secret': fleetOneClientSecret,
            'scope': 'transactions'
          })
        });

        if (!tokenResponse.ok) {
          // Try alternative FleetCor endpoints
          const altEndpoints = [
            'https://api.fleetcor.com/oauth/token',
            'https://connect.fleetone.com/oauth/token',
            'https://secure.fleetone.com/api/oauth/token'
          ];
          
          for (const endpoint of altEndpoints) {
            console.log(`Trying authentication endpoint: ${endpoint}`);
            
            const altResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              },
              body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'client_id': fleetOneClientId,
                'client_secret': fleetOneClientSecret
              })
            });
            
            if (altResponse.ok) {
              const tokenData = await altResponse.json();
              accessToken = tokenData.access_token;
              console.log('Successfully authenticated with FleetOne');
              break;
            } else {
              const errorText = await altResponse.text();
              console.log(`Failed ${endpoint}:`, altResponse.status, errorText);
            }
          }
          
          if (!accessToken) {
            throw new Error('Could not authenticate with FleetOne API. Please check credentials.');
          }
        } else {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
          console.log('Successfully authenticated with FleetOne');
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'FleetOne authentication failed',
            message: 'Could not get access token from FleetOne API',
            suggestion: 'Please verify your FleetOne API credentials'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Now fetch transactions using the access token
      const startDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = dateTo || new Date().toISOString().split('T')[0];
      
      console.log(`Fetching FleetOne transactions from ${startDate} to ${endDate}`);
      
      // FleetOne transaction endpoints to try
      const transactionEndpoints = [
        'https://api.fleetone.com/v1/transactions',
        'https://api.fleetcor.com/v1/transactions',
        'https://connect.fleetone.com/api/v1/transactions'
      ];
      
      let transactionData = null;
      let successfulEndpoint = null;
      
      for (const endpoint of transactionEndpoints) {
        try {
          console.log(`Trying transaction endpoint: ${endpoint}`);
          
          const queryParams = new URLSearchParams({
            'start_date': startDate,
            'end_date': endDate,
            ...(cardLastFour && { 'card_filter': cardLastFour })
          });
          
          const transactionResponse = await fetch(`${endpoint}?${queryParams}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (transactionResponse.ok) {
            transactionData = await transactionResponse.json();
            successfulEndpoint = endpoint;
            console.log('Successfully fetched transactions from FleetOne');
            break;
          } else {
            const errorText = await transactionResponse.text();
            console.log(`Failed ${endpoint}:`, transactionResponse.status, errorText);
          }
        } catch (error) {
          console.log(`Error with ${endpoint}:`, error.message);
        }
      }
      
      if (!transactionData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Could not fetch transactions from FleetOne API',
            message: 'All transaction endpoints failed',
            accessTokenObtained: !!accessToken,
            suggestion: 'FleetOne API might be using different endpoints. Please check the API documentation.'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Process FleetOne transactions
      let syncedCount = 0;
      let skippedCount = 0;
      const errors = [];
      
      console.log('FleetOne API Response structure:', Object.keys(transactionData));
      
      // FleetOne might return transactions in different structures
      const transactions = transactionData.transactions || 
                          transactionData.data || 
                          transactionData.results || 
                          (Array.isArray(transactionData) ? transactionData : []);
      
      if (transactions && Array.isArray(transactions)) {
        console.log(`Processing ${transactions.length} FleetOne transactions`);
        
        for (const transaction of transactions) {
          try {
            // Check if transaction already exists
            const transactionId = transaction.transaction_id || transaction.id || transaction.transactionId;
            const { data: existingTransaction } = await supabaseClient
              .from('fuel_expenses')
              .select('id')
              .eq('wex_reference_id', transactionId)
              .maybeSingle();

            if (existingTransaction) {
              skippedCount++;
              continue;
            }

            // Find driver by card number
            const cardNumber = transaction.card_number || transaction.cardNumber || transaction.card;
            const cardLastFour = cardNumber?.slice(-4);
            
            if (!cardLastFour) {
              console.log('Transaction missing card number:', transactionId);
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
            const transactionDate = new Date(transaction.transaction_date || transaction.date || transaction.transactionDate);
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
                  fuel_expenses: 0,
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
                total_amount: parseFloat(transaction.amount || transaction.total_amount || '0'),
                gallons_purchased: parseFloat(transaction.gallons || transaction.quantity || '0'),
                price_per_gallon: parseFloat(transaction.price_per_gallon || transaction.unit_price || '0'),
                station_name: transaction.merchant_name || transaction.merchantName || transaction.station,
                station_address: transaction.merchant_address || transaction.merchantAddress || transaction.location,
                fuel_type: transaction.fuel_type || transaction.fuelType || 'diesel',
                card_last_four: cardLastFour,
                wex_reference_id: transactionId,
                authorization_code: transaction.authorization_code || transaction.authCode,
                status: 'approved',
                raw_webhook_data: transaction,
                notes: 'Synced from FleetOne API'
              });

            if (insertError) {
              console.error('Error inserting fuel expense:', insertError);
              errors.push(`Transaction ${transactionId}: ${insertError.message}`);
            } else {
              syncedCount++;
              console.log('Synced transaction:', transactionId);
            }

          } catch (error) {
            console.error('Error processing transaction:', error);
            errors.push(`Transaction processing error: ${error.message}`);
          }
        }
      } else {
        console.log('No transactions found in FleetOne response');
      }

      // Log sync statistics
      await supabaseClient
        .from('system_stats')
        .insert({
          stat_type: 'fleetone_api_sync',
          stat_value: {
            synced_count: syncedCount,
            skipped_count: skippedCount,
            total_transactions: transactions?.length || 0,
            errors: errors,
            sync_date: new Date().toISOString(),
            date_range: { from: dateFrom, to: dateTo },
            endpoint_used: successfulEndpoint
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          synced: syncedCount,
          skipped: skippedCount,
          total: transactions?.length || 0,
          errors: errors.length > 0 ? errors : undefined,
          endpoint: successfulEndpoint,
          message: 'FleetOne sync completed successfully'
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
    console.error('Error in FleetOne sync function:', error);
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