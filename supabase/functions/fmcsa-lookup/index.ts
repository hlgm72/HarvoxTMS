import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FMCSACompanyData {
  name?: string;
  address?: string;
  dotNumber?: string;
  mcNumber?: string;
  phone?: string;
  safetyRating?: string;
  totalDrivers?: string;
  totalVehicles?: string;
  operationClassification?: string[];
  cargoCarried?: string[];
}

async function searchFMCSA(searchQuery: string, searchType: 'DOT' | 'MC' | 'NAME'): Promise<FMCSACompanyData | null> {
  try {
    console.log(`Searching FMCSA for ${searchType}: ${searchQuery}`);
    
    // Construct the URL based on ChatGPT's suggestion
    let url = '';
    const cleanQuery = searchQuery.replace(/^(MC-?|DOT-?)/, ''); // Remove MC- or DOT- prefix
    
    if (searchType === 'DOT') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_param=USDOT&query_string=${cleanQuery}`;
    } else if (searchType === 'MC') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_param=MC_MX&query_string=${cleanQuery}`;
    } else if (searchType === 'NAME') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_param=NAME&query_string=${encodeURIComponent(searchQuery)}`;
    }

    console.log('Requesting URL:', url);

    // Make the request to FMCSA SAFER
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      console.error('FMCSA request failed:', response.status, response.statusText);
      return null;
    }

    const html = await response.text();
    console.log('FMCSA response received, HTML length:', html.length);

    // Parse the HTML response to extract company information
    const companyData: FMCSACompanyData = {};

    // Log a snippet for debugging
    console.log('HTML snippet (first 1000 chars):', html.substring(0, 1000));

    // Check if we got an error page or no results
    if (html.includes('No records found') || html.includes('Missing Parameter') || html.includes('ERROR')) {
      console.log('FMCSA returned no results or error');
      return null;
    }

    // Extract Legal Name - more specific patterns
    let nameMatch = html.match(/Legal Name:\s*<[^>]*>([^<]+)</i) ||
                    html.match(/Entity Name:\s*<[^>]*>([^<]+)</i) ||
                    html.match(/Legal Name:<\/[^>]*>\s*<[^>]*>([^<]+)</i);
    
    if (nameMatch && nameMatch[1]) {
      companyData.name = nameMatch[1].trim();
      console.log('Found company name:', companyData.name);
    }

    // Extract DOT Number - look for specific patterns
    const dotMatch = html.match(/USDOT Number:\s*<[^>]*>([0-9]+)</i) ||
                     html.match(/USDOT\s*#?\s*:?\s*([0-9]+)/i) ||
                     html.match(/DOT\s*#?\s*:?\s*([0-9]+)/i);
    if (dotMatch && dotMatch[1]) {
      companyData.dotNumber = dotMatch[1].trim();
      console.log('Found DOT number:', companyData.dotNumber);
    }

    // Extract MC Number - more specific patterns  
    const mcMatch = html.match(/MC\/MX\/FF Number\(s\):\s*<[^>]*>([^<]+)</i) ||
                    html.match(/MC-?([0-9]+)/i) ||
                    html.match(/MC\s*#?\s*:?\s*([0-9]+)/i);
    if (mcMatch && mcMatch[1]) {
      companyData.mcNumber = mcMatch[1].trim().replace(/[^\d]/g, '');
      console.log('Found MC number:', companyData.mcNumber);
    }

    // Extract Physical Address
    const addressMatch = html.match(/Physical Address:\s*<[^>]*>([^<]+(?:<br\s*\/?>[\s\S]*?)+)/i) ||
                         html.match(/Mailing Address:\s*<[^>]*>([^<]+(?:<br\s*\/?>[\s\S]*?)+)/i);
    if (addressMatch && addressMatch[1]) {
      companyData.address = addressMatch[1]
        .replace(/<br\s*\/?>/gi, ', ')
        .replace(/<[^>]*>/g, '')
        .trim()
        .replace(/\s+/g, ' ');
      console.log('Found address:', companyData.address);
    }

    // Extract Phone Number
    const phoneMatch = html.match(/Phone:\s*<[^>]*>([^<]+)</i) ||
                       html.match(/\(([0-9]{3})\)\s*([0-9]{3})-?([0-9]{4})/);
    if (phoneMatch) {
      if (phoneMatch[1] && phoneMatch[2] && phoneMatch[3]) {
        companyData.phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
      } else if (phoneMatch[1]) {
        companyData.phone = phoneMatch[1].trim();
      }
      console.log('Found phone:', companyData.phone);
    }

    // Extract Power Units (vehicles)
    const powerUnitsMatch = html.match(/Power Units:\s*<[^>]*>([^<]+)</i);
    if (powerUnitsMatch && powerUnitsMatch[1]) {
      companyData.totalVehicles = powerUnitsMatch[1].trim();
      console.log('Found vehicles:', companyData.totalVehicles);
    }

    // Extract Drivers
    const driversMatch = html.match(/Drivers:\s*<[^>]*>([^<]+)</i);
    if (driversMatch && driversMatch[1]) {
      companyData.totalDrivers = driversMatch[1].trim();
      console.log('Found drivers:', companyData.totalDrivers);
    }

    // Extract Safety Rating
    const safetyMatch = html.match(/Safety Rating:\s*<[^>]*>([^<]+)</i);
    if (safetyMatch && safetyMatch[1]) {
      companyData.safetyRating = safetyMatch[1].trim();
      console.log('Found safety rating:', companyData.safetyRating);
    }

    console.log('Final parsed company data:', companyData);
    
    // Return data even if some fields are missing
    if (companyData.name || companyData.dotNumber || companyData.mcNumber) {
      return companyData;
    }
    
    return null;

  } catch (error) {
    console.error('Error searching FMCSA:', error);
    return null;
  }
}

serve(async (req) => {
  console.log('FMCSA lookup function called - REAL VERSION')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    
    const { searchQuery, searchType } = await req.json()
    console.log('Search query:', searchQuery, 'Type:', searchType)

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
      console.log('No company data found, but returning 200 status')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No company data found in FMCSA database' 
        }),
        { 
          status: 200, // Cambiar de 404 a 200
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = {
      success: true,
      data: companyData
    }

    console.log('Returning result:', result)

    return new Response(
      JSON.stringify(result),
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
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
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