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

    console.log('Full HTML response length:', html.length);
    console.log('HTML snippet for debugging:', html.substring(0, 3000));

    // Check if we got an error page
    if (html.includes('Missing Parameter') || html.includes('WARNING')) {
      console.log('FMCSA returned an error or warning page');
      return null;
    }

    // Look for the company name in various formats
    let nameMatch = html.match(/Legal Name:[^>]*>([^<]+)</i) ||
                    html.match(/>([A-Z][A-Z\s&.,'-]+INC?\.?|[A-Z][A-Z\s&.,'-]+LLC\.?|[A-Z][A-Z\s&.,'-]+CORP\.?)<[^>]*USDOT/i) ||
                    html.match(/Company Snapshot[^>]*>([^<]+)</i);
    
    if (nameMatch) {
      companyData.name = nameMatch[1].trim();
      console.log('Found company name:', companyData.name);
    }

    // Look for DOT number
    const dotMatch = html.match(/USDOT Number:\s*([0-9]+)/i);
    if (dotMatch) {
      companyData.dotNumber = dotMatch[1].trim();
      console.log('Found DOT number:', companyData.dotNumber);
    }

    // Look for MC number 
    const mcMatch = html.match(/MC[\/\-]?([0-9]+)/i);
    if (mcMatch) {
      companyData.mcNumber = mcMatch[1].trim();
      console.log('Found MC number:', companyData.mcNumber);
    }

    // Look for address patterns
    const addressMatch = html.match(/Physical Address:\s*([^<\n]+)/i) ||
                         html.match(/Mailing Address:\s*([^<\n]+)/i) ||
                         html.match(/([0-9]+\s+[^<\n]+(?:DRIVE|DR|STREET|ST|AVENUE|AVE|ROAD|RD|LANE|LN|BOULEVARD|BLVD|SUITE|STE)[^<\n]*)/i);
    if (addressMatch) {
      companyData.address = addressMatch[1].trim().replace(/\s+/g, ' ');
      console.log('Found address:', companyData.address);
    }

    // Look for phone
    const phoneMatch = html.match(/Phone:\s*([^<\n]+)/i) ||
                       html.match(/\(([0-9]{3})\)\s*([0-9]{3})-?([0-9]{4})/);
    if (phoneMatch) {
      companyData.phone = phoneMatch[1] ? phoneMatch[1].trim() : `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
      console.log('Found phone:', companyData.phone);
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