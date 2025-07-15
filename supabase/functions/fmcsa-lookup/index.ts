import * as cheerio from 'cheerio';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Enhanced FMCSA Company Data interface
interface FMCSACompanyData {
  legalName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  physicalAddress: string | null;
  mailingAddress: string | null;
  phone: string | null;
  email: string | null;
  carrierOperation: string | null;
  stateOfOperation: string | null;
  cargoCarried: string[];
  inspections: {
    inspections: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
    outOfService: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
    outOfServiceRate: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
  } | null;
  crashes: {
    fatal: string;
    injury: string;
    tow: string;
    total: string;
  } | null;
  safetyRating: {
    ratingDate: string | null;
    reviewDate: string | null;
    rating: string | null;
    type: string | null;
  } | null;
}

// Enhanced FMCSA HTML Parser function
function parseFMCSA_HTML(html: string): FMCSACompanyData {
  const $ = cheerio.load(html);

  const getTextAfterLabel = (label: string): string | null => {
    const el = $("td.queryfield").filter((_, el) =>
      $(el).text().includes(label)
    ).first();

    const next = el.next();
    return next.length ? next.text().trim() : null;
  };

  const extractCargoCarried = (): string[] => {
    const cargo: string[] = [];
    $('td font').each((_, el) => {
      const text = $(el).text().trim();
      if (
        text &&
        !["SAFER Layout", "Carrier Operation:", "Cargo Carried:"].includes(text)
      ) {
        cargo.push(text);
      }
    });
    return [...new Set(cargo)];
  };

  const parseInspections = () => {
    const rows = $("table[summary='Inspections']").first().find("tr");
    if (rows.length < 4) return null;

    const getCellText = (rowIndex: number, colIndex: number) =>
      $(rows[rowIndex]).find("td").eq(colIndex).text().trim() || "0";

    return {
      inspections: {
        vehicle: getCellText(1, 1),
        driver: getCellText(1, 2),
        hazmat: getCellText(1, 3),
        iep: getCellText(1, 4),
      },
      outOfService: {
        vehicle: getCellText(2, 1),
        driver: getCellText(2, 2),
        hazmat: getCellText(2, 3),
        iep: getCellText(2, 4),
      },
      outOfServiceRate: {
        vehicle: getCellText(3, 1),
        driver: getCellText(3, 2),
        hazmat: getCellText(3, 3),
        iep: getCellText(3, 4),
      },
    };
  };

  const parseCrashes = () => {
    const row = $("table[summary='Crashes']").first().find("tr").eq(1);
    if (!row.length) return null;
    
    const get = (i: number) => row.find("td").eq(i).text().trim() || "0";

    return {
      fatal: get(0),
      injury: get(1),
      tow: get(2),
      total: get(3),
    };
  };

  const parseSafetyRating = () => {
    const ratingTable = $("table").filter((_, el) =>
      $(el).text().includes("Rating Date:")
    ).first();

    if (!ratingTable.length) return null;

    const rows = ratingTable.find("tr");
    const getCell = (row: number, cell: number) =>
      rows.eq(row).find("td").eq(cell).text().trim() || null;

    return {
      ratingDate: getCell(1, 0),
      reviewDate: getCell(1, 1),
      rating: getCell(2, 0),
      type: getCell(2, 1),
    };
  };

  const fullText = $.root().text();

  return {
    legalName: $("td.queryfield b").first().text().trim() || null,
    dotNumber: fullText.match(/USDOT\s+(\d+)/)?.[1] || null,
    mcNumber: fullText.match(/\bMC\s+(\d+)/)?.[1] || null,
    physicalAddress: getTextAfterLabel("Physical Address:"),
    mailingAddress: getTextAfterLabel("Mailing Address:"),
    phone: fullText.match(/Phone:\s*([0-9\-\(\)\s]+)/)?.[1]?.trim() || null,
    email: fullText.match(/Email:\s*([^\s]+)/)?.[1]?.trim() || null,
    carrierOperation: getTextAfterLabel("Carrier Operation:"),
    stateOfOperation: getTextAfterLabel("State Carrier Operates In:"),
    cargoCarried: extractCargoCarried(),
    inspections: parseInspections(),
    crashes: parseCrashes(),
    safetyRating: parseSafetyRating(),
  };
}

// Enhanced FMCSA search function
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

    // Use the enhanced parser
    console.log('Parsing HTML with enhanced parser...');
    const companyData = parseFMCSA_HTML(html);
    
    console.log('📊 Final extracted data:', companyData);
    
    // Return null if no essential data was found
    if (!companyData.legalName && !companyData.dotNumber && !companyData.mcNumber) {
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
            rawHtml: html,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Returning enhanced data:', companyData)
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: companyData,
        debug: {
          searchQuery,
          searchType,
          htmlLength: html.length,
          rawHtml: html
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