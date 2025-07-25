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
    console.log('Starting WEX auto-sync job...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const wexUsername = Deno.env.get('WEX_API_USERNAME');
    const wexPassword = Deno.env.get('WEX_API_PASSWORD');

    if (!wexUsername || !wexPassword) {
      console.log('WEX API credentials not configured, skipping auto-sync');
      return new Response(JSON.stringify({ success: true, message: 'Credentials not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-sync the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    console.log(`Auto-syncing WEX transactions from ${yesterday} to ${today}`);

    // Call the sync function
    const syncResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/wex-sync`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_transactions',
          dateFrom: yesterday,
          dateTo: today
        })
      }
    );

    const syncResult = await syncResponse.json();
    
    if (syncResult.success) {
      console.log(`Auto-sync completed: ${syncResult.synced} synced, ${syncResult.skipped} skipped`);
      
      // Log auto-sync statistics
      await supabaseClient
        .from('system_stats')
        .insert({
          stat_type: 'wex_auto_sync',
          stat_value: {
            ...syncResult,
            sync_type: 'automatic',
            sync_date: new Date().toISOString(),
            date_range: { from: yesterday, to: today }
          }
        });
    } else {
      console.error('Auto-sync failed:', syncResult.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        auto_sync_result: syncResult,
        message: 'Auto-sync job completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in wex-auto-sync function:', error);
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