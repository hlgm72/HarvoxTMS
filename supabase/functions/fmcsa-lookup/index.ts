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

    console.log('HTML snippet for debugging:', html.substring(0, 2000));

    // Extract Legal Name - based on the screenshot, it should be in a table cell
    const nameMatch = html.match(/Legal Name:<\/[^>]*>\s*<[^>]*>([^<]+)</i) || 
                      html.match(/>([^<]+)<[^>]*USDOT Number:/i);
    if (nameMatch) {
      companyData.name = nameMatch[1].trim();
    }

    // Extract DOT Number - look for USDOT Number pattern
    const dotMatch = html.match(/USDOT Number:<\/[^>]*>\s*<[^>]*>([^<]+)</i) ||
                     html.match(/USDOT Number:\s*([0-9]+)/i);
    if (dotMatch) {
      companyData.dotNumber = dotMatch[1].trim();
    }

    // Extract MC Number - look for MC/MX/FF Number pattern
    const mcMatch = html.match(/MC\/MX\/FF Number[^:]*:<\/[^>]*>\s*<[^>]*>([^<]+)</i) ||
                    html.match(/MC-?([0-9]+)/i);
    if (mcMatch) {
      const mcNumber = mcMatch[1].trim().replace(/^MC-?/, '');
      companyData.mcNumber = mcNumber;
    }

    // Extract Physical Address
    const addressMatch = html.match(/Physical Address:<\/[^>]*>\s*<[^>]*>([^<]+)</i) ||
                         html.match(/Physical Address:\s*([^<\n]+)/i);
    if (addressMatch) {
      companyData.address = addressMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extract Phone
    const phoneMatch = html.match(/Phone:<\/[^>]*>\s*<[^>]*>([^<]+)</i) ||
                       html.match(/Phone:\s*([^<\n]+)/i);
    if (phoneMatch) {
      companyData.phone = phoneMatch[1].trim();
    }

    // Extract Mailing Address if Physical Address not found
    if (!companyData.address) {
      const mailingMatch = html.match(/Mailing Address:<\/[^>]*>\s*<[^>]*>([^<]+)</i);
      if (mailingMatch) {
        companyData.address = mailingMatch[1].trim().replace(/\s+/g, ' ');
      }
    }

    // Extract Operating Authority Status
    const authorityMatch = html.match(/Operating Authority Status:<\/[^>]*>\s*<[^>]*>([^<]+)</i);
    if (authorityMatch) {
      companyData.safetyRating = authorityMatch[1].trim();
    }

    // Extract Power Units (vehicles)
    const powerUnitsMatch = html.match(/Power Units:<\/[^>]*>\s*<[^>]*>([^<]+)</i);
    if (powerUnitsMatch) {
      companyData.totalVehicles = powerUnitsMatch[1].trim();
    }

    // Extract Drivers
    const driversMatch = html.match(/Drivers:<\/[^>]*>\s*<[^>]*>([^<]+)</i);
    if (driversMatch) {
      companyData.totalDrivers = driversMatch[1].trim();
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