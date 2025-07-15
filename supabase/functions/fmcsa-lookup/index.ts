const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface FMCSACompanyData {
  name?: string;
  address?: string;
  dotNumber?: string;
  mcNumber?: string;
  phone?: string;
  email?: string;
  safetyRating?: string;
  operatingStatus?: string;
  outOfServiceDate?: string;
  totalDrivers?: string;
  totalVehicles?: string;
  operationClassification?: string[];
  cargoCarried?: string[];
}

Deno.serve(async (req) => {
  console.log('🚀 FMCSA function started:', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request')
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('📝 Processing POST request')
    const { searchQuery, searchType } = await req.json()
    console.log('🔍 Search params:', { searchQuery, searchType })

    // For now, return mock data to test if the function works
    const mockData: FMCSACompanyData = {
      name: "PROJECT FREIGHT TRANSPORTATION INCORP",
      dotNumber: "2243569",
      mcNumber: "665756",
      phone: "(800) 832-5660",
      address: "123 MAIN ST, ANYTOWN, TX 12345",
      email: "info@projectfreight.com",
      safetyRating: "SATISFACTORY",
      operatingStatus: "ACTIVE",
      totalDrivers: "15",
      totalVehicles: "12"
    }

    console.log('✅ Returning mock data')
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mockData 
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error'
      }),
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