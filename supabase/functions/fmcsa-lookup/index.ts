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

async function searchFMCSA(searchQuery: string, searchType: 'DOT' | 'MC' | 'NAME'): Promise<FMCSACompanyData | null> {
  try {
    console.log(`🔍 Starting FMCSA search for ${searchType}: "${searchQuery}"`);
    
    // Construct the URL
    let url = '';
    const cleanQuery = searchQuery.replace(/^(MC-?|DOT-?)/, ''); // Remove MC- or DOT- prefix
    console.log(`📝 Original query: "${searchQuery}" -> Clean query: "${cleanQuery}"`);
    
    if (searchType === 'DOT') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_param=USDOT&query_string=${cleanQuery}`;
    } else if (searchType === 'MC') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&original_query_param=MC_MX&query_string=${cleanQuery}`;
    } else if (searchType === 'NAME') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_param=NAME&query_string=${encodeURIComponent(searchQuery)}`;
    }

    console.log('🌐 Final URL:', url);

    // Make the request to FMCSA SAFER
    console.log('📡 Making request to FMCSA...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.error(`❌ HTTP error! status: ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log(`📄 Received HTML response (${html.length} characters)`);

    // Parse the HTML to extract company information
    const companyData: FMCSACompanyData = {};

    // Extract company name - try multiple patterns
    let nameMatch = html.match(/<TD[^>]*><CENTER><B>([^<]+)<\/B><\/CENTER><\/TD>/i);
    if (!nameMatch) {
      nameMatch = html.match(/<b>([^<]+)<\/b>/i);
    }
    if (!nameMatch) {
      nameMatch = html.match(/Legal Name:\s*([^<\n]+)/i);
    }
    if (nameMatch) {
      companyData.name = nameMatch[1].trim();
      console.log('✅ Found name:', companyData.name);
    }

    // Extract DOT number
    const dotMatch = html.match(/USDOT Number:\s*([0-9]+)/i);
    if (dotMatch) {
      companyData.dotNumber = dotMatch[1].trim();
      console.log('✅ Found DOT:', companyData.dotNumber);
    }

    // Extract MC number - try multiple patterns
    let mcMatch = html.match(/MC\/MX\/FF Number\(s\):\s*([A-Z]+-?[0-9]+)/i);
    if (!mcMatch) {
      mcMatch = html.match(/MC-([0-9]+)/i);
    }
    if (!mcMatch) {
      mcMatch = html.match(/MC([0-9]+)/i);
    }
    if (mcMatch) {
      companyData.mcNumber = mcMatch[1] ? `MC-${mcMatch[1]}` : mcMatch[0].trim();
      console.log('✅ Found MC:', companyData.mcNumber);
    }

    // Extract phone number - try multiple patterns
    let phoneMatch = html.match(/Phone:\s*\(([0-9]{3})\)\s*([0-9]{3}-[0-9]{4})/i);
    if (!phoneMatch) {
      phoneMatch = html.match(/\(([0-9]{3})\)\s*([0-9]{3}-[0-9]{4})/);
    }
    if (phoneMatch) {
      companyData.phone = `(${phoneMatch[1]}) ${phoneMatch[2]}`;
      console.log('✅ Found phone:', companyData.phone);
    }

    // Extract address - try multiple patterns
    let addressMatch = html.match(/Physical Address:<\/TD[^>]*>\s*<TD[^>]*>([^<]+)<BR>([^<]+)<BR>([^<]+)<\/TD>/i);
    if (!addressMatch) {
      addressMatch = html.match(/Physical Address:\s*([^<\n]+)\s*([^<\n]+)\s*([^<\n]+)/i);
    }
    if (!addressMatch) {
      addressMatch = html.match(/Address:\s*([^<\n]+)/i);
    }
    if (addressMatch) {
      if (addressMatch[3]) {
        companyData.address = `${addressMatch[1].trim()}, ${addressMatch[2].trim()}, ${addressMatch[3].trim()}`;
      } else {
        companyData.address = addressMatch[1].trim();
      }
      console.log('✅ Found address:', companyData.address);
    }

    // Log the HTML snippet for debugging
    console.log('📋 HTML snippet (first 500 chars):', html.substring(0, 500));
    console.log('📋 HTML snippet (around USDOT):', html.substring(html.indexOf('USDOT') - 100, html.indexOf('USDOT') + 200));

    // Extract additional valuable information
    
    // Extract Safety Rating
    let safetyMatch = html.match(/Safety Rating:\s*([^<\n]+)/i);
    if (!safetyMatch) {
      safetyMatch = html.match(/Overall Rating:\s*([^<\n]+)/i);
    }
    if (safetyMatch) {
      companyData.safetyRating = safetyMatch[1].trim();
      console.log('✅ Found safety rating:', companyData.safetyRating);
    }

    // Extract Operating Status
    let statusMatch = html.match(/Operating Status:\s*([^<\n]+)/i);
    if (!statusMatch) {
      statusMatch = html.match(/Status:\s*([^<\n]+)/i);
    }
    if (statusMatch) {
      companyData.operatingStatus = statusMatch[1].trim();
      console.log('✅ Found operating status:', companyData.operatingStatus);
    }

    // Extract Out of Service Date
    const oosMatch = html.match(/Out of Service Date:\s*([^<\n]+)/i);
    if (oosMatch && oosMatch[1].trim() !== 'None' && oosMatch[1].trim() !== '') {
      companyData.outOfServiceDate = oosMatch[1].trim();
      console.log('✅ Found out of service date:', companyData.outOfServiceDate);
    }

    // Extract Total Drivers
    let driversMatch = html.match(/Total Drivers:\s*([0-9]+)/i);
    if (!driversMatch) {
      driversMatch = html.match(/Drivers:\s*([0-9]+)/i);
    }
    if (driversMatch) {
      companyData.totalDrivers = driversMatch[1].trim();
      console.log('✅ Found total drivers:', companyData.totalDrivers);
    }

    // Extract Total Vehicles  
    let vehiclesMatch = html.match(/Total Vehicles:\s*([0-9]+)/i);
    if (!vehiclesMatch) {
      vehiclesMatch = html.match(/Vehicles:\s*([0-9]+)/i);
    }
    if (vehiclesMatch) {
      companyData.totalVehicles = vehiclesMatch[1].trim();
      console.log('✅ Found total vehicles:', companyData.totalVehicles);
    }

    // Extract Operation Classification
    const opClassMatch = html.match(/Operation Classification:\s*([^<\n]+)/i);
    if (opClassMatch) {
      companyData.operationClassification = [opClassMatch[1].trim()];
      console.log('✅ Found operation classification:', companyData.operationClassification);
    }

    // Extract Cargo Carried
    const cargoMatch = html.match(/Cargo Carried:\s*([^<\n]+)/i);
    if (cargoMatch) {
      companyData.cargoCarried = [cargoMatch[1].trim()];
      console.log('✅ Found cargo carried:', companyData.cargoCarried);
    }

    // Extract Email (if available)
    const emailMatch = html.match(/Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      companyData.email = emailMatch[1].trim();
      console.log('✅ Found email:', companyData.email);
    }

    // Log the complete HTML for detailed analysis (first 1000 characters)
    console.log('🔍 Complete HTML sample for analysis:', html.substring(0, 1000));

    console.log('📊 Final extracted data:', companyData);

    // Return null if no essential data was found
    if (!companyData.name && !companyData.dotNumber && !companyData.mcNumber) {
      console.log('❌ No essential company data found');
      return null;
    }

    return companyData;
  } catch (error) {
    console.error('❌ Error searching FMCSA:', error);
    return null;
  }
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

    if (!searchQuery || !searchType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing searchQuery or searchType' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!['DOT', 'MC', 'NAME'].includes(searchType)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid searchType. Must be DOT, MC, or NAME' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call the real FMCSA scraping function
    const companyData = await searchFMCSA(searchQuery, searchType as 'DOT' | 'MC' | 'NAME')

    if (!companyData) {
      console.log('No company data found')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No company data found in FMCSA database',
          debug: {
            searchQuery,
            searchType,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Returning real data:', companyData)
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: companyData 
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