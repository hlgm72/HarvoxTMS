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
            content: 'Extract ALL fuel transactions. Return compact JSON only - no extra text.'
          },
          {
            role: 'user',
            content: `Extract every transaction from this PDF:

${pdfText}

Extract these fields for each:
date (YYYY-MM-DD), card, unit, invoice, location_name, city, state, qty, gross_ppg, gross_amt, disc_amt, fees, total_amt

Return compact JSON:
{"columnsFound":[],"hasAuthorizationCode":false,"authorizationCodeField":null,"sampleData":[...],"analysis":"Found X transactions"}

Extract ALL rows. Use numbers not strings for amounts. Be complete.`
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
      // Check if response was likely truncated
      const responseLength = responseText.length;
      const isTruncated = !responseText.trim().endsWith('}') || responseText.includes('"date": "2025-03\n');
      
      if (isTruncated) {
        console.warn('Response appears to be truncated. Length:', responseLength);
        console.warn('Last 100 chars:', responseText.slice(-100));
      }
      
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON from the response
      let jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      let jsonToParse = jsonMatch ? jsonMatch[0] : cleanedText;
      
      // If JSON appears truncated, try to close it
      if (isTruncated && jsonToParse) {
        console.log('Attempting to repair truncated JSON...');
        // Count unclosed arrays and objects
        const openBrackets = (jsonToParse.match(/\[/g) || []).length;
        const closeBrackets = (jsonToParse.match(/\]/g) || []).length;
        const openBraces = (jsonToParse.match(/\{/g) || []).length;
        const closeBraces = (jsonToParse.match(/\}/g) || []).length;
        
        // Close unclosed structures
        for (let i = 0; i < (openBrackets - closeBrackets); i++) {
          jsonToParse += ']';
        }
        for (let i = 0; i < (openBraces - closeBraces); i++) {
          jsonToParse += '}';
        }
        
        console.log('Repaired JSON length:', jsonToParse.length);
      }
      
      analysisResult = JSON.parse(jsonToParse);

      // Validate and normalize the structure
      analysisResult = {
        columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
        hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
        authorizationCodeField: analysisResult.authorizationCodeField || null,
        sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
        analysis: analysisResult.analysis || `Analysis completed. Extracted ${analysisResult.sampleData?.length || 0} transactions.`,
        wasTruncated: isTruncated
      };

      if (isTruncated) {
        console.log(`Successfully recovered ${analysisResult.sampleData.length} transactions from truncated response`);
      }

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response length:', responseText.length);
      console.error('Last 200 chars of response:', responseText.slice(-200));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'The AI response was incomplete or invalid. This can happen with very large PDFs.',
          details: 'The PDF might have too many transactions for a single analysis. Try with a smaller date range.',
          technicalDetails: parseError.message,
          responseLength: responseText.length
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
