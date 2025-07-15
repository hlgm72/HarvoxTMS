import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
  safetyRating?: string;
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
      // Use the same format that works: query_type=queryCarrierSnapshot&query_param=MC_MX
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
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    console.log('📈 Response received:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    console.log('  Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ FMCSA request failed:', response.status, response.statusText);
      return null;
    }

    const html = await response.text();
    console.log('📄 HTML Response Analysis:');
    console.log('  Length:', html.length);
    console.log('  Content Type:', response.headers.get('content-type'));
    
    // Log the first 2000 characters for better debugging
    console.log('📖 First 2000 chars of HTML:');
    console.log(html.substring(0, 2000));
    console.log('📖 Last 500 chars of HTML:');
    console.log(html.substring(Math.max(0, html.length - 500)));
    
    // DEBUGGING: Let's also check if we can find key indicators
    console.log('🔍 HTML Content Analysis:');
    console.log('- Contains "PROJECT FREIGHT": ', html.includes('PROJECT FREIGHT'));
    console.log('- Contains "USDOT Number": ', html.includes('USDOT Number'));
    console.log('- Contains "2243569": ', html.includes('2243569'));
    console.log('- Contains asterisks (**): ', html.includes('**'));
    console.log('- Contains "Company Snapshot": ', html.includes('Company Snapshot'));
    
    
    // Check if we got a valid HTML page
    if (!html.includes('<html') && !html.includes('<HTML')) {
      console.log('⚠️ Response does not appear to be HTML');
      return null;
    }

    // More comprehensive no-results patterns
    const noResultsPatterns = [
      'No carriers',
      'not found', 
      'No results',
      'Your search returned 0 records',
      'No records found',
      'Missing Parameter',
      'ERROR',
      'No data available',
      'Search returned no results',
      'carrier information not found',
      'no matches found',
      'search criteria did not return any records'
    ];
    
    let foundNoResultsPattern = null;
    for (const pattern of noResultsPatterns) {
      if (html.toLowerCase().includes(pattern.toLowerCase())) {
        foundNoResultsPattern = pattern;
        break;
      }
    }
    
    if (foundNoResultsPattern) {
      console.log(`❌ FMCSA no results pattern found: "${foundNoResultsPattern}"`);
      return null;
    }

    console.log('✅ No "no results" patterns found, proceeding to parse...');

    // Parse the HTML response to extract company information
    const companyData: FMCSACompanyData = {};

    // Extract Legal Name with multiple patterns
    console.log('🔍 Searching for company name...');
    const namePatterns = [
      // Very broad patterns to catch company names
      /([A-Z][A-Z\s&.,'\-INCORPORATED()]+(?:INCORPORATED|INC|LLC|CORP|CORPORATION|LTD|LIMITED|COMPANY|CO))/i,
      /PROJECT\s+FREIGHT\s+TRANSPORTATION\s+INCORPORATED/i,
      // Markdown-like patterns
      /\*\*([^*]+)\*\*/,
      // HTML patterns
      /<b>([^<]+)<\/b>/i,
      /<strong>([^<]+)<\/strong>/i,
      // Previous patterns
      /Legal Name:\s*<[^>]*>([^<]+)/i,
      /Entity Name:\s*<[^>]*>([^<]+)/i,
      /DBA Name:\s*<[^>]*>([^<]+)/i,
    ];
    
    console.log('🔍 Trying to extract company name with multiple patterns...');
    for (let i = 0; i < namePatterns.length; i++) {
      const pattern = namePatterns[i];
      const match = html.match(pattern);
      console.log(`Pattern ${i + 1} result:`, match ? `Found: "${match[1]?.trim()}"` : 'No match');
      if (match && match[1] && match[1].trim().length > 3) {
        companyData.name = match[1].trim();
        console.log('✅ Found company name:', companyData.name);
        break;
      }
    }

    // Extract DOT Number with multiple patterns
    console.log('🔍 Searching for DOT number...');
    const dotPatterns = [
      // New pattern for current FMCSA structure: USDOT Number: 2243569
      /USDOT Number:\s*([0-9]+)/i,
      /USDOT Number:\s*<[^>]*>([0-9]+)/i,
      /USDOT\s*#?\s*:?\s*([0-9]+)/i,
      /DOT\s*#?\s*:?\s*([0-9]+)/i,
      /<td[^>]*>USDOT Number:<\/td>\s*<td[^>]*>([0-9]+)<\/td>/i
    ];
    
    console.log('🔍 Trying to extract DOT number with multiple patterns...');
    for (let i = 0; i < dotPatterns.length; i++) {
      const pattern = dotPatterns[i];
      const match = html.match(pattern);
      console.log(`DOT Pattern ${i + 1} result:`, match ? `Found: "${match[1]?.trim()}"` : 'No match');
      if (match && match[1]) {
        companyData.dotNumber = match[1].trim();
        console.log('✅ Found DOT number:', companyData.dotNumber);
        break;
      }
    }

    // Extract MC Number with multiple patterns  
    console.log('🔍 Searching for MC number...');
    const mcPatterns = [
      /MC\/MX\/FF Number\(s\):\s*<[^>]*>([^<]+)/i,
      /MC-?([0-9]+)/i,
      /MC\s*#?\s*:?\s*([0-9]+)/i,
      /<td[^>]*>MC\/MX\/FF Number\(s\):<\/td>\s*<td[^>]*>([^<]+)<\/td>/i
    ];
    
    for (const pattern of mcPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        companyData.mcNumber = match[1].trim().replace(/[^\d]/g, '');
        console.log('✅ Found MC number:', companyData.mcNumber);
        break;
      }
    }

    // Extract Physical Address
    console.log('🔍 Searching for address...');
    const addressPatterns = [
      /Physical Address:\s*<[^>]*>([^<]+(?:<br\s*\/?>[\s\S]*?)+)/i,
      /Mailing Address:\s*<[^>]*>([^<]+(?:<br\s*\/?>[\s\S]*?)+)/i,
      /<td[^>]*>Physical Address:<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i
    ];
    
    for (const pattern of addressPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        companyData.address = match[1]
          .replace(/<br\s*\/?>/gi, ', ')
          .replace(/<[^>]*>/g, '')
          .trim()
          .replace(/\s+/g, ' ');
        console.log('✅ Found address:', companyData.address);
        break;
      }
    }

    console.log('📊 Final parsed company data:', companyData);
    
    // Return data if we found at least one key field
    if (companyData.name || companyData.dotNumber || companyData.mcNumber) {
      console.log('✅ Successfully parsed company data');
      return companyData;
    }
    
    console.log('❌ No key company data found in response');
    
    // Log more details about what we received
    console.log('🔍 Analyzing response structure...');
    console.log('Response contains "company" text:', html.toLowerCase().includes('company'));
    console.log('Response contains "motor carrier" text:', html.toLowerCase().includes('motor carrier'));
    console.log('Response contains "dot" text:', html.toLowerCase().includes('dot'));
    console.log('Response contains "mc-" text:', html.toLowerCase().includes('mc-'));
    console.log('Response contains table tags:', html.toLowerCase().includes('<table'));
    console.log('Response contains form tags:', html.toLowerCase().includes('<form'));
    
    // Check if we got an error page or empty result
    if (html.toLowerCase().includes('no records found') || 
        html.toLowerCase().includes('no companies found') ||
        html.toLowerCase().includes('search returned no results')) {
      console.log('🚫 FMCSA returned explicit "no results" message');
    }
    
    // If we didn't find anything, let's look for common table structures
    const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi);
    if (tableMatches) {
      console.log(`🔍 Found ${tableMatches.length} table(s) in response`);
      tableMatches.forEach((table, index) => {
        console.log(`Table ${index + 1} content (first 500 chars):`, table.substring(0, 500));
      });
    }
    
    return null;

  } catch (error) {
    console.error('💥 Error searching FMCSA:', error);
    console.error('Error stack:', error.stack);
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
      console.log('No company data found, returning debug info')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No company data found in FMCSA database',
          debug: {
            searchQuery,
            searchType,
            timestamp: new Date().toISOString(),
            suggestion: 'Try checking if the number is correct or search by company name instead'
          }
        }),
        { 
          status: 200, 
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