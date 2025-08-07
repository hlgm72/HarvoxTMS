import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Health check for critical systems
    const healthChecks = {
      timestamp: new Date().toISOString(),
      database: false,
      authentication: false,
      criticalTables: false,
      acidFunctions: false,
      storageAccess: false
    }

    // 1. Test database connection
    try {
      const { data: dbTest, error: dbError } = await supabase
        .from('companies')
        .select('count')
        .limit(1)
      
      healthChecks.database = !dbError
    } catch (error) {
      console.error('❌ Database health check failed:', error)
    }

    // 2. Test authentication system
    try {
      const { data: authTest, error: authError } = await supabase.auth.getSession()
      healthChecks.authentication = !authError
    } catch (error) {
      console.error('❌ Auth health check failed:', error)
    }

    // 3. Test critical tables accessibility
    try {
      const criticalTables = [
        'companies',
        'user_company_roles', 
        'company_payment_periods',
        'driver_period_calculations',
        'loads',
        'fuel_expenses'
      ]

      const tableChecks = await Promise.all(
        criticalTables.map(async (table) => {
          try {
            const { error } = await supabase
              .from(table)
              .select('*')
              .limit(1)
            return !error
          } catch {
            return false
          }
        })
      )

      healthChecks.criticalTables = tableChecks.every(check => check)
    } catch (error) {
      console.error('❌ Critical tables check failed:', error)
    }

    // 4. Test ACID functions
    try {
      // Test a simple ACID function to ensure they're working
      const { data: acidTest, error: acidError } = await supabase.rpc('get_current_user_email')
      healthChecks.acidFunctions = !acidError
    } catch (error) {
      console.error('❌ ACID functions check failed:', error)
    }

    // 5. Test storage access
    try {
      const { data: storageTest, error: storageError } = await supabase.storage
        .from('company-documents')
        .list('', { limit: 1 })
      
      healthChecks.storageAccess = !storageError
    } catch (error) {
      console.error('❌ Storage access check failed:', error)
    }

    // Calculate overall health score
    const healthScore = Object.values(healthChecks)
      .filter(value => typeof value === 'boolean')
      .reduce((acc, check) => acc + (check ? 1 : 0), 0)
    
    const totalChecks = Object.values(healthChecks)
      .filter(value => typeof value === 'boolean').length

    const healthPercentage = (healthScore / totalChecks) * 100

    const response = {
      status: healthPercentage === 100 ? 'healthy' : healthPercentage >= 80 ? 'degraded' : 'critical',
      healthScore: `${healthScore}/${totalChecks}`,
      healthPercentage,
      checks: healthChecks,
      recommendations: []
    }

    // Add recommendations based on failed checks
    if (!healthChecks.database) {
      response.recommendations.push('Database connection issues detected - check Supabase status')
    }
    if (!healthChecks.criticalTables) {
      response.recommendations.push('Critical table access issues - verify RLS policies')
    }
    if (!healthChecks.acidFunctions) {
      response.recommendations.push('ACID functions not responding - check database functions')
    }
    if (!healthChecks.storageAccess) {
      response.recommendations.push('Storage access issues - verify bucket permissions')
    }

    // Log health status
    console.log(`🔍 System Health: ${response.status} (${healthPercentage}%)`)
    
    // Alert if critical
    if (healthPercentage < 80) {
      console.error('🚨 CRITICAL: System health below 80%', response)
      
      // Here you could add integration with monitoring services:
      // - Send to Slack/Discord
      // - Trigger PagerDuty alert
      // - Send email notifications
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: healthPercentage >= 80 ? 200 : 503
      }
    )

  } catch (error) {
    console.error('❌ Health check function error:', error)
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Health check system failure',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})