import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SourceCity {
  id: string
  state_code: string
  city_name: string
  created_at: string
  updated_at: string
}

interface TargetCity {
  name: string
  state_id: string
  county: null
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting city migration process...')

    // Initialize source Supabase client (the other project)
    const sourceSupabaseUrl = Deno.env.get('SOURCE_SUPABASE_URL')
    const sourceSupabaseKey = Deno.env.get('SOURCE_SUPABASE_ANON_KEY')
    
    if (!sourceSupabaseUrl || !sourceSupabaseKey) {
      throw new Error('Missing SOURCE_SUPABASE_URL or SOURCE_SUPABASE_ANON_KEY environment variables')
    }

    const sourceSupabase = createClient(sourceSupabaseUrl, sourceSupabaseKey)

    // Initialize destination Supabase client (current project)
    const destSupabaseUrl = Deno.env.get('SUPABASE_URL')!
    const destSupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const destSupabase = createClient(destSupabaseUrl, destSupabaseKey)

    console.log('📋 Clients initialized successfully')

    // Get state mapping from destination database
    console.log('🗺️ Getting state mappings...')
    const { data: states, error: statesError } = await destSupabase
      .from('states')
      .select('id, name')

    if (statesError) {
      throw new Error(`Failed to fetch states: ${statesError.message}`)
    }

    // Create state code to state ID mapping
    const stateMapping: Record<string, string> = {}
    states?.forEach(state => {
      stateMapping[state.id] = state.id // Already using state codes as IDs
    })

    console.log(`📍 Found ${Object.keys(stateMapping).length} states in mapping`)

    // Get total count from source
    const { count: totalCities, error: countError } = await sourceSupabase
      .from('state_cities')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw new Error(`Failed to count cities: ${countError.message}`)
    }

    console.log(`📊 Total cities to migrate: ${totalCities}`)

    // Check how many cities already exist in destination
    const { count: existingCities, error: existingError } = await destSupabase
      .from('state_cities')
      .select('*', { count: 'exact', head: true })

    if (existingError) {
      throw new Error(`Failed to count existing cities: ${existingError.message}`)
    }

    console.log(`📋 Existing cities in destination: ${existingCities}`)

    // Migrate cities in batches
    const batchSize = 500
    let offset = 0
    let totalMigrated = 0
    let totalSkipped = 0
    let totalErrors = 0

    while (offset < totalCities!) {
      console.log(`📦 Processing batch ${Math.floor(offset / batchSize) + 1} (cities ${offset + 1}-${Math.min(offset + batchSize, totalCities!)})`)

      // Fetch batch from source
      const { data: sourceCities, error: fetchError } = await sourceSupabase
        .from('state_cities')
        .select('*')
        .range(offset, offset + batchSize - 1)

      if (fetchError) {
        console.error(`❌ Failed to fetch batch at offset ${offset}:`, fetchError.message)
        totalErrors += batchSize
        offset += batchSize
        continue
      }

      if (!sourceCities || sourceCities.length === 0) {
        console.log('✅ No more cities to process')
        break
      }

      // Log first city structure to debug
      if (offset === 0 && sourceCities.length > 0) {
        console.log('🔍 Sample source city structure:', JSON.stringify(sourceCities[0], null, 2))
      }

      // Get all existing cities for this batch's states to check duplicates efficiently
      const statesInBatch = [...new Set(sourceCities.map((city: SourceCity) => city.state_code))]
      const { data: existingCities, error: existingError } = await destSupabase
        .from('state_cities')
        .select('name, state_id')
        .in('state_id', statesInBatch)

      if (existingError) {
        console.error(`❌ Failed to fetch existing cities:`, existingError.message)
        totalErrors += sourceCities.length
        offset += batchSize
        continue
      }

      // Create a Set for fast duplicate checking
      const existingCitiesSet = new Set(
        existingCities?.map(city => `${city.name}|${city.state_id}`) || []
      )

      // Transform and filter cities for destination
      const citiesToInsert: TargetCity[] = []
      const invalidCities: string[] = []
      let batchSkipped = 0

      sourceCities.forEach((city: SourceCity) => {
        // Check if state_code exists in our mapping
        if (!stateMapping[city.state_code]) {
          invalidCities.push(`${city.city_name}, ${city.state_code}`)
          return
        }

        // Check for existing city using the Set (much faster)
        const cityKey = `${city.city_name}|${city.state_code}`
        if (existingCitiesSet.has(cityKey)) {
          batchSkipped++
          return // Skip if city already exists in this state
        }

        citiesToInsert.push({
          name: city.city_name,
          state_id: city.state_code, // Use state_code directly as state_id
          county: null
        })
      })

      if (invalidCities.length > 0) {
        console.warn(`⚠️ Skipping ${invalidCities.length} cities with invalid state codes:`, invalidCities.slice(0, 5))
        totalSkipped += invalidCities.length
      }

      if (batchSkipped > 0) {
        console.log(`📋 Skipped ${batchSkipped} duplicate cities in this batch`)
        totalSkipped += batchSkipped
      }

      if (citiesToInsert.length > 0) {
        // Insert batch into destination
        const { data: insertResult, error: insertError } = await destSupabase
          .from('state_cities')
          .insert(citiesToInsert)
          .select('id')

        if (insertError) {
          console.error(`❌ Failed to insert batch:`, insertError.message)
          totalErrors += citiesToInsert.length
        } else {
          totalMigrated += insertResult?.length || citiesToInsert.length
          console.log(`✅ Successfully inserted ${insertResult?.length || citiesToInsert.length} cities`)
        }
      } else {
        console.log(`📝 No new cities to insert in this batch`)
      }

      offset += batchSize

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Final summary
    const summary = {
      success: true,
      total_source_cities: totalCities,
      cities_migrated: totalMigrated,
      cities_skipped: totalSkipped,
      cities_with_errors: totalErrors,
      existing_cities_before: existingCities,
      message: `Migration completed! ${totalMigrated} cities migrated, ${totalSkipped} skipped, ${totalErrors} errors.`
    }

    console.log('🎉 Migration Summary:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Migration failed. Check the logs for details.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})