import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('FMCSA lookup function called - simple version')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    
    const { searchQuery, searchType } = await req.json()
    console.log('Search query:', searchQuery, 'Type:', searchType)

    // Return test data first to ensure function works
    const testData = {
      name: 'TRANSPORT COMPANY LLC',
      address: '123 Main St, Chicago, IL 60601',
      dotNumber: searchQuery,
      mcNumber: searchType === 'MC' ? searchQuery : 'MC-123456',
      phone: '(555) 123-4567',
      safetyRating: 'SATISFACTORY'
    }

    return new Response(
      JSON.stringify(testData),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})