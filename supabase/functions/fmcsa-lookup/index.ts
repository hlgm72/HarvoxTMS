import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

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
  dba: string | null;  // Doing Business As
  entityType: string | null;  // CARRIER, etc.
  usdotStatus: string | null;  // ACTIVE, INACTIVE, etc.
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

// Enhanced FMCSA HTML Parser function - Hybrid approach
function parseFMCSA_HTML(html: string): FMCSACompanyData {
  const $ = cheerio.load(html);
  
  // Get clean text version for regex parsing
  const fullText = html
    .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')           // Replace &nbsp; with spaces
    .replace(/&#160;/g, ' ')           // Replace &#160; with spaces
    .replace(/&amp;/g, '&')            // Replace &amp; with &
    .replace(/\s+/g, ' ')              // Replace multiple spaces with single space
    .trim();

  // Helper function to clean extracted text from navigation artifacts
  const cleanExtractedText = (text: string): string => {
    if (!text) return text;
    
    // Remove common SAFER navigation artifacts
    const cleanText = text
      .replace(/SAFER\s+Layout/gi, '')
      .replace(/SAFER\s+Table\s+Layout/gi, '')
      .replace(/Company\s+Snapshot/gi, '')
      .replace(/X\s+Interstate/gi, 'Interstate')
      .replace(/X\s+Intrastate/gi, 'Intrastate')
      .replace(/\bX\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanText;
  };

  // Helper function to extract text using boundaries
  const extractField = (label: string, text: string): string | null => {
    const index = text.indexOf(label);
    if (index !== -1) {
      const start = index + label.length;
      
      // Define common field labels to know where to stop
      const fieldLabels = [
        'Legal Name:', 'DBA Name:', 'Physical Address:', 'Mailing Address:',
        'Phone:', 'Operating Status:', 'Entity Type:', 'USDOT Number:',
        'MC/MX/FF Number(s):', 'Safety Rating:', 'Out of Service Date:',
        'Total Drivers:', 'Total Vehicles:', 'DUNS Number:', 'Power Units:',
        'Review Information:', 'Rating Date:', 'Review Date:', 'Carrier Operation:',
        'State Carrier Operates In:', 'Cargo Carried:', 'SMS Results', 'Other Information'
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
      const cleaned = extracted
        .replace(/^\s*[\s:]+/, '')      // Remove leading spaces and colons
        .replace(/\s+$/, '')            // Remove trailing spaces
        .replace(/^[:\s]*/, '')         // Remove leading colons and spaces
        .trim();
        
      return cleanExtractedText(cleaned);
    }
    return null;
  };

  // Extract Legal Name - improved patterns with cleaning
  let legalName: string | null = null;
  
  // Method 1: Look for pattern "COMPANY NAME USDOT Number:" - most reliable
  const nameUsdotMatch = fullText.match(/([A-Z][A-Z\s&,.-]+?)\s+USDOT\s+Number:/i);
  if (nameUsdotMatch) {
    legalName = cleanExtractedText(nameUsdotMatch[1].trim());
  }
  
  // Method 2: Try to find in title
  if (!legalName) {
    const titleMatch = html.match(/<title[^>]*>SAFER Web - Company Snapshot\s+([^<]+)</i);
    if (titleMatch) {
      legalName = cleanExtractedText(titleMatch[1].trim());
    }
  }
  
  // Method 3: Look for Legal Name field with better boundaries
  if (!legalName) {
    const legalField = extractField('Legal Name:', fullText);
    if (legalField && legalField.length > 2 && legalField.length < 100) {
      legalName = legalField;
    }
  }
  
  // Method 4: Extract from snapshot context if still not found
  if (!legalName) {
    const snapshotMatch = fullText.match(/Company\s+Snapshot\s+([A-Z][A-Z\s&,.-]+?)(?:\s+USDOT|\s+Other)/i);
    if (snapshotMatch) {
      legalName = cleanExtractedText(snapshotMatch[1].trim());
    }
  }

  // Extract DOT number with multiple patterns
  let dotNumber: string | null = null;
  const dotPatterns = [
    /USDOT\s+Number:\s*(\d+)/i,
    /USDOT\s+(\d+)/i,
    /DOT\s*#?\s*:?\s*(\d+)/i
  ];
  
  for (const pattern of dotPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      dotNumber = match[1];
      break;
    }
  }

  // Extract MC number with multiple patterns
  let mcNumber: string | null = null;
  const mcPatterns = [
    /MC\/MX\/FF\s+Number\(s\):\s*MC[A-Z]*-?(\d+)/i,
    /MC\s*#?\s*:?\s*(\d+)/i,
    /MC-(\d+)/i
  ];
  
  for (const pattern of mcPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      mcNumber = match[1];
      break;
    }
  }

  // Extract Phone with better pattern matching
  let phone: string | null = null;
  const phonePatterns = [
    /Phone:\s*(\([0-9]{3}\)\s*[0-9]{3}-[0-9]{4})/i,
    /Phone:\s*([0-9]{3}-[0-9]{3}-[0-9]{4})/i,
    /Phone:\s*(\([0-9]{3}\)\s*[0-9]{7})/i,
    /Phone:\s*([0-9\-\(\)\s]{10,})/i
  ];
  
  for (const pattern of phonePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      phone = match[1].trim();
      break;
    }
  }

  // Extract Physical Address
  let physicalAddress = extractField('Physical Address:', fullText);
  
  // Extract Mailing Address
  let mailingAddress = extractField('Mailing Address:', fullText);

  // Extract Email
  let email: string | null = null;
  const emailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    email = emailMatch[1].trim();
  }

  // Extract Carrier Operation with improved cleaning
  let carrierOperation = extractField('Carrier Operation:', fullText);
  if (carrierOperation) {
    // Special cleaning for carrier operation field
    carrierOperation = carrierOperation
      .replace(/SAFER\s+Layout/gi, '')
      .replace(/X\s+(Interstate|Intrastate)/gi, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If it's too long or has artifacts, try to extract just the operation types
    if (carrierOperation.length > 50) {
      const operations = [];
      if (carrierOperation.includes('Interstate')) operations.push('Interstate');
      if (carrierOperation.includes('Intrastate')) operations.push('Intrastate');
      if (operations.length > 0) {
        carrierOperation = operations.join(', ');
      }
    }
  }

  // Extract DBA (Doing Business As)
  let dba = extractField('DBA Name:', fullText);
  if (!dba || dba.toLowerCase().includes('no') || dba.toLowerCase().includes('none') || dba.trim() === '') {
    dba = null;
  }

  // Extract Entity Type
  let entityType = extractField('Entity Type:', fullText);
  if (!entityType) {
    // Look for patterns like "CARRIER" in the text
    const entityMatch = fullText.match(/Entity\s+Type:\s*(\w+)/i);
    if (entityMatch) {
      entityType = entityMatch[1].toUpperCase();
    } else if (fullText.includes('CARRIER')) {
      entityType = 'CARRIER';
    }
  }

  // Extract USDOT Status
  let usdotStatus = extractField('Operating Status:', fullText);
  if (!usdotStatus) {
    // Look for status patterns
    const statusMatch = fullText.match(/Operating\s+Status:\s*(\w+)/i);
    if (statusMatch) {
      usdotStatus = statusMatch[1].toUpperCase();
    } else if (fullText.includes('ACTIVE')) {
      usdotStatus = 'ACTIVE';
    }
  }

  // Extract State of Operation
  let stateOfOperation = extractField('State Carrier Operates In:', fullText);

  // Extract Cargo Carried - look for list after "Cargo Carried:"
  const cargoCarried: string[] = [];
  const cargoIndex = fullText.indexOf('Cargo Carried:');
  if (cargoIndex !== -1) {
    const cargoSection = fullText.substring(cargoIndex, cargoIndex + 500);
    const cargoLines = cargoSection.split('\n').slice(1, 10); // Take next few lines
    for (const line of cargoLines) {
      const cleaned = line.trim();
      if (cleaned && !cleaned.includes(':') && cleaned.length > 2 && cleaned.length < 50) {
        cargoCarried.push(cleaned);
      }
    }
  }

  // Parse Inspections using table parsing
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

  // Parse Crashes using table parsing
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

  // Parse Safety Rating
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

  return {
    legalName,
    dotNumber,
    mcNumber,
    physicalAddress,
    mailingAddress,
    phone,
    email,
    dba,
    entityType,
    usdotStatus,
    carrierOperation,
    stateOfOperation,
    cargoCarried,
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
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&original_query_param=USDOT&query_string=${cleanQuery}`;
    } else if (searchType === 'MC') {
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&original_query_param=MC_MX&query_string=${cleanQuery}`;
    } else if (searchType === 'NAME') {
      // Para búsqueda por nombre, usar el mismo formato que MC y DOT
      const nameQuery = searchQuery.trim().replace(/\s+/g, '+');
      
      // Usar el formato correcto que funciona con FMCSA
      url = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=NAME&original_query_param=NAME&query_string=${nameQuery}`;
      console.log(`🏷️ NAME SEARCH - Using correct FMCSA format: "${url}"`);
    }

    console.log('🌐 Final URL:', url);
    console.log('🌐 Search query details:', { searchType, originalQuery: searchQuery, cleanedQuery: searchType !== 'NAME' ? cleanQuery : searchQuery });

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
      console.error(`❌ Status text: ${response.statusText}`);
      console.error(`❌ Response headers:`, Object.fromEntries(response.headers.entries()));
      
      // Try to get response text even on error
      try {
        const errorText = await response.text();
        console.error(`❌ Error response body: ${errorText.substring(0, 500)}`);
      } catch (e) {
        console.error(`❌ Could not read error response body`);
      }
      return null;
    }

    const html = await response.text();
    console.log(`📄 Received HTML response (${html.length} characters)`);
    
    // Check if the response indicates no results found
    if (html.includes("No records found") || html.includes("no entities were found") || html.includes("not found")) {
      console.log('🚫 FMCSA returned "no results found" message');
      return null;
    }
    
    // Para búsquedas por nombre, mostrar más información de debug
    if (searchType === 'NAME') {
      console.log('🔍 NAME SEARCH DEBUG - First 1000 chars of HTML:');
      console.log(html.substring(0, 1000));
      console.log('🔍 NAME SEARCH DEBUG - Last 500 chars of HTML:');
      console.log(html.substring(html.length - 500));
    }
    
    // Para búsquedas por nombre, verificar si es una página de resultados intermedios o snapshot directo
    if (searchType === 'NAME') {
      const $ = cheerio.load(html);
      const title = $('head > title').text();
      const isSnapshot = title.includes('SAFER Web - Company Snapshot');
      
      console.log(`📋 Page title: "${title}"`);
      console.log(`📋 Is direct snapshot: ${isSnapshot}`);
      
      if (isSnapshot) {
        console.log('✅ Direct snapshot page detected');
        // Es un snapshot directo, procesar normalmente
      } else {
        console.log('📋 Detected intermediate results page for name search');
        
        // Buscar enlaces que contengan MC_MX o MC- en la página de resultados
        const mcLinks = $('a[href*="MC_MX"], a[href*="MC-"]').map((_, a) => $(a).attr('href')).get();
        
        console.log(`🔍 Found ${mcLinks.length} MC links:`, mcLinks);
        
        if (mcLinks.length === 0) {
          console.log('❌ No MC links found in results page');
          return null;
        }
        
        // Tomar el primer enlace
        const firstLink = mcLinks[0];
        const snapshotUrl = firstLink.startsWith('http') ? firstLink : `https://safer.fmcsa.dot.gov/${firstLink}`;
        
        console.log(`🔗 Navigating to first result: ${snapshotUrl}`);
        
        // Hacer una nueva petición al snapshot directo
        const snapshotResponse = await fetch(snapshotUrl, {
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
        
        if (snapshotResponse.ok) {
          const snapshotHtml = await snapshotResponse.text();
          console.log(`📄 Received snapshot HTML (${snapshotHtml.length} characters)`);
          
          // Store the snapshot HTML for parsing
          (globalThis as any).lastHtml = snapshotHtml;
          
          // Parse the snapshot page
          const companyData = parseFMCSA_HTML(snapshotHtml);
          console.log('📊 Final extracted data from snapshot:', companyData);
          
          // Return null if no essential data was found
          if (!companyData.legalName && !companyData.dotNumber && !companyData.mcNumber) {
            console.log('❌ No essential company data found in snapshot');
            return null;
          }
          
          return companyData;
        } else {
          console.error(`❌ Failed to fetch snapshot: ${snapshotResponse.status}`);
          return null;
        }
      }
    }
    
    // Store HTML globally for access in the main function
    (globalThis as any).lastHtml = html;

    // Use the enhanced parser
    console.log('Parsing HTML with enhanced parser...');
    const companyData = parseFMCSA_HTML(html);
    
    console.log('📊 Final extracted data:', companyData);
    
    // Return null if no essential data was found
    if (!companyData.legalName && !companyData.dotNumber && !companyData.mcNumber) {
      console.log('❌ No essential company data found');
      console.log('🔍 HTML snippet for debugging:', html.substring(0, 500));
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