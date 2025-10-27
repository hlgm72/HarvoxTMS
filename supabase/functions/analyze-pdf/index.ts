import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Starting PDF image analysis...');
    
    const { imagePages } = await req.json();

    if (!imagePages || !Array.isArray(imagePages) || imagePages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Image pages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Image received, analyzing ${imagePages.length} pages with Lovable AI (Gemini)...`);

    // Analizar todas las páginas juntas
    const contentParts: any[] = [
      {
        type: 'text',
        text: `Extract ALL fuel transactions from these ${imagePages.length} pages.

For EACH row you see, extract:
- date: Transaction date (YYYY-MM-DD format)
- card: Full card number
- unit: Unit/vehicle number  
- invoice: Invoice number
- location_name: Gas station name
- city: City name
- state: 2-letter state code
- qty: Gallons (number)
- gross_ppg: Price per gallon (number)
- gross_amt: Gross amount (number)
- disc_amt: Discount (number, 0 if none)
- fees: Fees (number, 0 if none)
- total_amt: Total amount (number)

Return JSON:
{
  "columnsFound": ["list of column headers"],
  "hasAuthorizationCode": false,
  "authorizationCodeField": null,
  "sampleData": [array of ALL transactions from ALL pages],
  "analysis": "Found N transactions across M pages"
}

Extract ALL visible rows from ALL pages, not just examples.`
      }
    ];

    // Agregar todas las páginas como imágenes
    for (let i = 0; i < imagePages.length; i++) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imagePages[i]}`,
          detail: 'high'
        }
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a fuel transaction data extractor. Extract ALL visible transactions from ALL pages. Return valid JSON only.'
          },
          {
            role: 'user',
            content: contentParts
          }
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Lovable AI error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    console.log('Lovable AI analysis complete');
    console.log('Gemini raw response:', responseText.substring(0, 500));

    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON from the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      const jsonToParse = jsonMatch ? jsonMatch[0] : cleanedText;
      
      analysisResult = JSON.parse(jsonToParse);

      // Validate and normalize the structure
      analysisResult = {
        columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
        hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
        authorizationCodeField: analysisResult.authorizationCodeField || null,
        sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
        analysis: analysisResult.analysis || 'Analysis completed'
      };

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response from OpenAI:', responseText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'The AI could not process this image. The PDF might be too complex, low quality, or not contain a fuel transactions table.',
          details: 'Please ensure the PDF contains a clear table of fuel transactions and try again.',
          technicalDetails: parseError.message,
          rawResponse: responseText.substring(0, 200) // First 200 chars for debugging
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error processing image', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
