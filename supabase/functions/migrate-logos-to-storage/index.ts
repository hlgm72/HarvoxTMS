import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all clients with Clearbit logos
    const { data: clients, error: clientsError } = await supabaseClient
      .from('company_clients')
      .select('id, name, logo_url')
      .like('logo_url', '%clearbit.com%')

    if (clientsError) {
      throw clientsError
    }

    console.log(`Found ${clients?.length || 0} clients with Clearbit logos`)

    const results = {
      total: clients?.length || 0,
      migrated: 0,
      failed: 0,
      errors: [] as string[]
    }

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No clients with Clearbit logos found',
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const client of clients) {
      try {
        console.log(`Processing client: ${client.name} (${client.id})`)
        
        // Download the image from Clearbit
        const imageResponse = await fetch(client.logo_url)
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`)
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        const imageBlob = new Blob([imageBuffer])
        
        // Create organized folder structure with company name: client-id/company-name.png
        const cleanCompanyName = client.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        const filePath = `${client.id}/${cleanCompanyName}.png`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseClient.storage
          .from('client-logos')
          .upload(filePath, imageBlob, {
            contentType: 'image/png',
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        // Get the public URL
        const { data: publicUrl } = supabaseClient.storage
          .from('client-logos')
          .getPublicUrl(filePath)

        // Update client record with new URL
        const { error: updateError } = await supabaseClient
          .from('company_clients')
          .update({ logo_url: publicUrl.publicUrl })
          .eq('id', client.id)

        if (updateError) {
          throw updateError
        }

        results.migrated++
        console.log(`Successfully migrated logo for ${client.name}`)
        
      } catch (error) {
        console.error(`Failed to migrate logo for ${client.name}:`, error)
        results.failed++
        results.errors.push(`${client.name}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration completed. ${results.migrated} successful, ${results.failed} failed.`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})