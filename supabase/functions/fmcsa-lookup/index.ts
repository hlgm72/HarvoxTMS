import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('FMCSA lookup function called')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { searchQuery, searchType } = await req.json()
    console.log('Search query:', searchQuery, 'Type:', searchType)

    // Simple test response first to ensure function works
    const testData = {
      name: 'TEST COMPANY',
      address: '123 Test St, Test City, TX 12345',
      dotNumber: searchQuery,
      mcNumber: searchType === 'MC' ? searchQuery : 'MC-123456',
      phone: '(555) 123-4567',
      safetyRating: 'SATISFACTORY'
    }

    return new Response(
      JSON.stringify(testData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
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