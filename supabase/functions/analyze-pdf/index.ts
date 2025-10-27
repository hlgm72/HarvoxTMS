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
                text: `Analyze this fuel transaction document image and extract ALL transactions you see.

CRITICAL EXTRACTION RULES:
1. Read EVERY row of the table carefully
2. Extract ALL transactions that appear (not just a sample)
3. For card numbers: extract the FULL number from EACH individual row
4. For locations: separate station name, city, and state
5. For amounts: write the COMPLETE number (if you see $156.45, write 156.45 NOT 56.45)
6. For dates: convert to YYYY-MM-DD format

IMPORTANT RULES:
- DO NOT assume all rows have the same card number
- Verify EACH row individually
- Read ALL digits of amounts
- DO NOT invent data you don't see
- If you cannot read the image clearly, return empty arrays but ALWAYS return valid JSON

YOU MUST respond ONLY with this exact JSON structure (no markdown, no explanations):
{
  "columnsFound": ["list_of_all_columns_you_see"],
  "hasAuthorizationCode": true or false,
  "authorizationCodeField": "authorization_field_name or null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "complete_card_number_from_this_row",
      "unit": "unit_number",
      "invoice": "invoice_number",
      "location_name": "exact_station_name",
      "city": "city_name",
      "state": "two_letter_state_code",
      "qty": gallons_number,
      "gross_ppg": price_per_gallon_number,
      "gross_amt": gross_amount_COMPLETE_number,
      "disc_amt": discount_number,
      "fees": fees_number,
      "total_amt": total_COMPLETE_number
    }
  ],
  "analysis": "Brief description of how many transactions found and columns"
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
