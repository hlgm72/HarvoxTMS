import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

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
    console.log('Starting PDF text analysis...');
    
    const { pdfText } = await req.json();

    if (!pdfText) {
      return new Response(
        JSON.stringify({ error: 'PDF text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Text received, analyzing with Lovable AI (Gemini)...');
    console.log('Text length:', pdfText.length);

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
            content: 'You are a fuel transaction data extractor. Extract ALL visible transactions from the text. Return valid JSON only.'
          },
          {
            role: 'user',
            content: `Extract ALL fuel transactions from this PDF text. Look at EVERY transaction row.

PDF TEXT:
${pdfText}

For EACH transaction you see, extract:
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
  "sampleData": [array of ALL transactions],
  "analysis": "Found N transactions"
}

Extract ALL visible rows, not just examples. Be thorough and extract every single transaction.`
          }
        ],
        max_completion_tokens: 16000,
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
