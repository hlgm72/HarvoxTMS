import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Prepare the search form data based on FMCSA form structure
    const formData = new FormData();
    
    if (searchType === 'DOT') {
      formData.append('searchtype', 'USDOT');
      formData.append('query', searchQuery);
    } else if (searchType === 'MC') {
      formData.append('searchtype', 'MC_MX');
      formData.append('query', searchQuery);
    } else if (searchType === 'NAME') {
      formData.append('searchtype', 'Company_Name');
      formData.append('query', searchQuery);
    }

    // Make the request to FMCSA
    const response = await fetch('https://safer.fmcsa.dot.gov/query.asp', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    if (!response.ok) {
      console.error('FMCSA request failed:', response.status, response.statusText);
      return null;
    }

    const html = await response.text();
    console.log('FMCSA response received, parsing...');

    // Parse the HTML response to extract company information
    const companyData: FMCSACompanyData = {};

    // Extract company name
    const nameMatch = html.match(/<td[^>]*>\s*<b>Entity Type:<\/b>[^<]*<\/td>\s*<td[^>]*>\s*<b>Legal Name:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (nameMatch) {
      companyData.name = nameMatch[1].trim();
    }

    // Extract DOT Number
    const dotMatch = html.match(/<td[^>]*>\s*<b>USDOT Number:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (dotMatch) {
      companyData.dotNumber = dotMatch[1].trim();
    }

    // Extract MC Number
    const mcMatch = html.match(/<td[^>]*>\s*<b>MC\/MX\/FF Number\(s\):<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (mcMatch) {
      companyData.mcNumber = mcMatch[1].trim().replace(/MC-/, '');
    }

    // Extract Physical Address
    const addressMatch = html.match(/<td[^>]*>\s*<b>Physical Address:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (addressMatch) {
      companyData.address = addressMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extract Phone
    const phoneMatch = html.match(/<td[^>]*>\s*<b>Phone:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (phoneMatch) {
      companyData.phone = phoneMatch[1].trim();
    }

    // Extract Safety Rating
    const safetyMatch = html.match(/<td[^>]*>\s*<b>Safety Rating:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (safetyMatch) {
      companyData.safetyRating = safetyMatch[1].trim();
    }

    // Extract Total Drivers
    const driversMatch = html.match(/<td[^>]*>\s*<b>Total Drivers:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (driversMatch) {
      companyData.totalDrivers = driversMatch[1].trim();
    }

    // Extract Total Vehicles
    const vehiclesMatch = html.match(/<td[^>]*>\s*<b>Total Power Units:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (vehiclesMatch) {
      companyData.totalVehicles = vehiclesMatch[1].trim();
    }

    // Extract Operation Classification
    const operationMatch = html.match(/<td[^>]*>\s*<b>Operation Classification:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (operationMatch) {
      companyData.operationClassification = operationMatch[1].trim().split(',').map(s => s.trim());
    }

    // Extract Cargo Carried
    const cargoMatch = html.match(/<td[^>]*>\s*<b>Cargo Carried:<\/b>[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (cargoMatch) {
      companyData.cargoCarried = cargoMatch[1].trim().split(',').map(s => s.trim());
    }

    console.log('Parsed company data:', companyData);
    return companyData;

  } catch (error) {
    console.error('Error searching FMCSA:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery, searchType } = await req.json();

    if (!searchQuery || !searchType) {
      return new Response(
        JSON.stringify({ error: 'Missing searchQuery or searchType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!['DOT', 'MC', 'NAME'].includes(searchType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid searchType. Must be DOT, MC, or NAME' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const companyData = await searchFMCSA(searchQuery, searchType as 'DOT' | 'MC' | 'NAME');

    if (!companyData) {
      return new Response(
        JSON.stringify({ error: 'No company data found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: companyData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in FMCSA lookup function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});