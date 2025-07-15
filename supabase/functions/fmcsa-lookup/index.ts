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
    
    // Store HTML globally for access in the main function
    (globalThis as any).lastHtml = html;

    // Convert HTML to plain text and clean it properly
    const text = html
      .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
      .replace(/&nbsp;/g, ' ')           // Replace &nbsp; with spaces
      .replace(/&#160;/g, ' ')           // Replace &#160; with spaces
      .replace(/&amp;/g, '&')            // Replace &amp; with &
      .replace(/\s+/g, ' ')              // Replace multiple spaces with single space
      .trim();
    
    console.log('📝 Cleaned text sample (first 800 chars):', text.substring(0, 800));

    // Improved helper function to extract data with better boundaries
    function extractField(label: string, text: string): string | null {
      const index = text.indexOf(label);
      if (index !== -1) {
        const start = index + label.length;
        
        // Define common field labels to know where to stop
        const fieldLabels = [
          'Legal Name:', 'DBA Name:', 'Physical Address:', 'Mailing Address:',
          'Phone:', 'Operating Status:', 'Entity Type:', 'USDOT Number:',
          'MC/MX/FF Number(s):', 'Safety Rating:', 'Out of Service Date:',
          'Total Drivers:', 'Total Vehicles:', 'DUNS Number:', 'Power Units:',
          'Review Information:', 'Rating Date:', 'Review Date:'
        ];
        
        // Find the next field label or reasonable text boundary
        let end = text.length;
        for (const nextLabel of fieldLabels) {
          const nextIndex = text.indexOf(nextLabel, start + 1);
          if (nextIndex > start && nextIndex < end) {
            end = nextIndex;
          }
        }
        
        // If no field boundary found, limit to reasonable length
        if (end === text.length) {
          end = Math.min(start + 150, text.length);
        }
        
        const extracted = text.substring(start, end).trim();
        
        // Clean up common artifacts
        return extracted
          .replace(/^\s*[\s:]+/, '')      // Remove leading spaces and colons
          .replace(/\s+$/, '')            // Remove trailing spaces
          .replace(/^[:\s]*/, '')         // Remove leading colons and spaces
          .trim();
      }
      return null;
    }

    // Parse the text to extract company information using ChatGPT's approach
    const companyData: FMCSACompanyData = {};

    // Extract Legal Name
    let name = extractField('Legal Name:', text);
    if (!name) {
      name = extractField('DBA Name:', text);
    }
    if (name) {
      companyData.name = name.replace(/\s+/g, ' ').trim();
      console.log('✅ Found name:', companyData.name);
    }

    // Extract DOT number
    const dotText = extractField('USDOT Number:', text);
    if (dotText) {
      const dotMatch = dotText.match(/([0-9]+)/);
      if (dotMatch) {
        companyData.dotNumber = dotMatch[1];
        console.log('✅ Found DOT:', companyData.dotNumber);
      }
    }

    // Extract MC number
    const mcText = extractField('MC/MX/FF Number(s):', text);
    if (mcText) {
      const mcMatch = mcText.match(/(MC[A-Z]*-?[0-9]+)/i);
      if (mcMatch) {
        companyData.mcNumber = mcMatch[1].toUpperCase();
        console.log('✅ Found MC:', companyData.mcNumber);
      }
    }

    // Extract Phone number
    const phoneText = extractField('Phone:', text);
    if (phoneText) {
      const phoneMatch = phoneText.match(/(\([0-9]{3}\)\s*[0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4}|\([0-9]{3}\)\s*[0-9]{7})/);
      if (phoneMatch) {
        companyData.phone = phoneMatch[1].trim();
        console.log('✅ Found phone:', companyData.phone);
      }
    }

    // Extract Physical Address
    const addressText = extractField('Physical Address:', text);
    if (addressText) {
      // Clean up the address
      const cleanAddress = addressText.replace(/\s+/g, ' ').trim();
      if (cleanAddress.length > 10) { // Basic validation
        companyData.address = cleanAddress;
        console.log('✅ Found address:', companyData.address);
      }
    }

    // Extract additional fields using the same method
    
    // Extract Operating Status - try multiple variations
    let operatingText = extractField('Operating Status:', text) || 
                       extractField('USDOT Status:', text) ||
                       extractField('Carrier Status:', text);
    if (operatingText) {
      companyData.operatingStatus = operatingText.replace(/\s+/g, ' ').trim();
      console.log('✅ Found operating status:', companyData.operatingStatus);
    }

    // Extract Entity Type (sometimes shows business type)
    const entityText = extractField('Entity Type:', text);
    if (entityText) {
      console.log('✅ Found entity type:', entityText.trim());
    }

    // Extract DBA Name if different from Legal Name
    const dbaText = extractField('DBA Name:', text);
    if (dbaText && dbaText.trim() !== companyData.name) {
      console.log('✅ Found DBA name:', dbaText.trim());
    }

    // Try to extract email from the text
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      companyData.email = emailMatch[1].trim();
      console.log('✅ Found email:', companyData.email);
    }

    // Extract additional fields if they exist in the text
    const outOfServiceText = extractField('Out of Service Date:', text);
    if (outOfServiceText && outOfServiceText.trim() !== 'None' && outOfServiceText.trim() !== '') {
      companyData.outOfServiceDate = outOfServiceText.trim();
      console.log('✅ Found out of service date:', companyData.outOfServiceDate);
    }

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
    const html = (globalThis as any).lastHtml || ''

    if (!companyData) {
      console.log('No company data found')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No company data found in FMCSA database',
          debug: {
            searchQuery,
            searchType,
            htmlLength: html.length,
            rawHtml: html.substring(0, 5000),
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
        data: companyData,
        debug: {
          searchQuery,
          searchType,
          htmlLength: html.length,
          rawHtml: html.substring(0, 5000)
        }
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