import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArchiveRequest {
  operation: 'check' | 'execute' | 'status'
  notify?: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { operation = 'check', notify = true }: ArchiveRequest = await req.json()
    
    console.log(`Archive scheduler started - Operation: ${operation}`)
    
    switch (operation) {
      case 'check':
        return await checkArchiveNeeds(supabase)
      
      case 'execute':
        return await executeArchive(supabase, notify)
      
      case 'status':
        return await getArchiveStatus(supabase)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }
    
  } catch (error) {
    console.error('Archive scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Archive operation failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function checkArchiveNeeds(supabase: any) {
  console.log('Checking if archiving is needed...')
  
  // Check loads that would be archived
  const { data: oldLoads, error } = await supabase
    .from('loads')
    .select('id, load_number, created_at, status')
    .eq('status', 'completed')
    .lt('created_at', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString())
  
  if (error) {
    throw new Error(`Failed to check old loads: ${error.message}`)
  }
  
  // Check current database size/performance metrics
  const { data: tableStats } = await supabase
    .rpc('pg_stat_user_tables')
    .select('relname, n_live_tup, seq_scan')
    .eq('schemaname', 'public')
    .eq('relname', 'loads')
    .single()
  
  const shouldArchive = oldLoads.length > 0
  const performanceImpact = tableStats?.seq_scan > 10000 // High sequential scans
  
  const result = {
    needs_archiving: shouldArchive,
    records_to_archive: oldLoads.length,
    performance_impact: performanceImpact,
    recommendation: shouldArchive 
      ? `Archive recommended: ${oldLoads.length} old loads found`
      : 'No archiving needed at this time',
    threshold_date: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    old_loads_sample: oldLoads.slice(0, 5) // Show first 5 as sample
  }
  
  console.log('Archive check completed:', result)
  
  return new Response(
    JSON.stringify(result),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function executeArchive(supabase: any, notify: boolean) {
  console.log('Executing archive operation...')
  
  // Call the database function
  const { data: result, error } = await supabase
    .rpc('move_to_archive_with_logging')
  
  if (error) {
    throw new Error(`Archive execution failed: ${error.message}`)
  }
  
  console.log('Archive executed:', result)
  
  // Send notification if requested and records were moved
  if (notify && result.records_moved > 0) {
    await sendArchiveNotification(supabase, result)
  }
  
  return new Response(
    JSON.stringify({
      ...result,
      notification_sent: notify && result.records_moved > 0
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function getArchiveStatus(supabase: any) {
  console.log('Getting archive status...')
  
  // Get recent archive logs
  const { data: logs, error } = await supabase
    .from('archive_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10)
  
  if (error) {
    throw new Error(`Failed to get archive logs: ${error.message}`)
  }
  
  // Get current table sizes
  const { data: activeLoads } = await supabase
    .from('loads')
    .select('id', { count: 'exact', head: true })
  
  const { data: archivedLoads } = await supabase
    .from('loads_archive')
    .select('id', { count: 'exact', head: true })
  
  const status = {
    recent_operations: logs,
    current_stats: {
      active_loads: activeLoads?.length || 0,
      archived_loads: archivedLoads?.length || 0,
      last_archive: logs?.[0]?.completed_at || null
    }
  }
  
  console.log('Archive status retrieved:', status)
  
  return new Response(
    JSON.stringify(status),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function sendArchiveNotification(supabase: any, archiveResult: any) {
  console.log('Sending archive notification...')
  
  // Insert notification record (you could extend this to send emails)
  const { error } = await supabase
    .from('system_stats')
    .insert({
      stat_type: 'archive_notification',
      stat_value: {
        records_archived: archiveResult.records_moved,
        log_id: archiveResult.log_id,
        timestamp: new Date().toISOString(),
        message: archiveResult.message
      }
    })
  
  if (error) {
    console.error('Failed to create notification record:', error)
  } else {
    console.log('Archive notification sent successfully')
  }
}