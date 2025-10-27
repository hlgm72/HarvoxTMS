import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image base64 data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image received, analyzing with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a specialized document analysis assistant. You MUST respond ONLY with valid JSON. Do not include any explanatory text, apologies, or comments outside the JSON structure. If you cannot analyze the image, return valid JSON with empty arrays.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing a fuel transaction document. Your task is to extract EVERY SINGLE TRANSACTION visible in the image.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. Look at the ENTIRE table from top to bottom
2. Extract EVERY row that contains transaction data
3. DO NOT skip any rows - we need ALL transactions
4. Even if there are 50+ transactions, extract ALL OF THEM
5. The "sampleData" array should contain ALL transactions, not just samples

DATA EXTRACTION RULES:
- Card numbers: Extract the COMPLETE card number from each row
- Dates: Convert to YYYY-MM-DD format (e.g., "10/21/2025" becomes "2025-10-21")
- Amounts: Include the FULL number with decimals (e.g., $156.45 → 156.45)
- Locations: Separate into station name, city, and state
- Quantities: Extract gallons as numbers
- Prices: Extract price per gallon as numbers

QUALITY CHECKS:
✓ Did you read EVERY row in the table?
✓ Is your sampleData array as long as the number of rows you see?
✓ Did you extract complete card numbers from each row?
✓ Are ALL amounts complete with decimals?

RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):
{
  "columnsFound": ["Card #", "Tran Date", "Location Name", etc.],
  "hasAuthorizationCode": false,
  "authorizationCodeField": null,
  "sampleData": [
    {
      "date": "2025-10-21",
      "card": "708305003086527160",
      "unit": "123",
      "invoice": "INV001",
      "location_name": "LOVES 347",
      "city": "HOUSTON",
      "state": "TX",
      "qty": 49.90,
      "gross_ppg": 2.86,
      "gross_amt": 143.72,
      "disc_amt": 0,
      "fees": 0,
      "total_amt": 143.72
    }
  ],
  "analysis": "Found X transactions from [date range]"
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    console.log('OpenAI analysis complete');
    console.log('OpenAI raw response:', responseText.substring(0, 500));

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
