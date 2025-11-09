import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper para enviar eventos SSE
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Starting PDF text analysis...');
    
    const { pdfText, streaming } = await req.json();

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

    // Si no se pide streaming, usar el flujo original
    if (!streaming) {
      return await handleNonStreamingAnalysis(pdfText, lovableApiKey);
    }

    // Modo streaming: retornar un stream de eventos SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, 'progress', { 
            step: 'analyzing', 
            message: 'Analizando PDF con IA...' 
          });

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
            content: `Extract ALL fuel transactions from this text. Extract EVERY transaction you find:

${pdfText}

Required fields: date (YYYY-MM-DD), card, unit, invoice, location_name, city, state, qty, gross_ppg, gross_amt, disc_amt, fees, total_amt

JSON format (use numbers for amounts):
{"columnsFound":["date","card"...],"hasAuthorizationCode":false,"authorizationCodeField":null,"sampleData":[{"date":"2025-01-15","card":"12345"...}],"analysis":"Found X transactions"}

CRITICAL: Extract EVERY transaction in the PDF. Do not skip any transactions. Extract ALL of them, even if the response is large. Prioritize completeness over brevity.`
          }
        ],
        max_completion_tokens: 32000,
        response_format: { type: "json_object" },
        temperature: 0.1
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
      
      console.log('Gemini raw response:', cleanedText.substring(0, 500));
      console.log('Response length:', cleanedText.length);
      
      // Strategy 1: Try direct parse first
      try {
        analysisResult = JSON.parse(cleanedText);
        console.log('✅ Direct parse successful');
      } catch (directParseError) {
        console.log('❌ Direct parse failed, trying recovery strategies...');
        
        // Strategy 2: Progressive truncation - remove chars from end until valid JSON
        let recovered = false;
        let testText = cleanedText;
        
        // Try removing characters from the end progressively
        for (let charsToRemove = 1; charsToRemove <= 200 && !recovered; charsToRemove += 5) {
          testText = cleanedText.substring(0, cleanedText.length - charsToRemove);
          
          // Find the last complete transaction object
          const lastCompleteBrace = testText.lastIndexOf('}');
          if (lastCompleteBrace === -1) continue;
          
          testText = testText.substring(0, lastCompleteBrace + 1);
          
          // Count brackets and braces to close properly
          const openBrackets = (testText.match(/\[/g) || []).length;
          const closeBrackets = (testText.match(/\]/g) || []).length;
          const openBraces = (testText.match(/\{/g) || []).length;
          const closeBraces = (testText.match(/\}/g) || []).length;
          
          let repairedText = testText;
          
          // Close unclosed structures
          for (let i = 0; i < (openBrackets - closeBrackets); i++) {
            repairedText += ']';
          }
          for (let i = 0; i < (openBraces - closeBraces); i++) {
            repairedText += '}';
          }
          
          try {
            analysisResult = JSON.parse(repairedText);
            console.log(`✅ Recovery successful after removing ${charsToRemove} chars`);
            console.log(`Recovered ${analysisResult.sampleData?.length || 0} transactions`);
            recovered = true;
            break;
          } catch (repairError) {
            // Continue trying
            continue;
          }
        }
        
        if (!recovered) {
          throw new Error('Could not recover valid JSON from truncated response');
        }
      }

      // Validate and normalize the structure
      const transactionCount = analysisResult.sampleData?.length || 0;
      analysisResult = {
        columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
        hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
        authorizationCodeField: analysisResult.authorizationCodeField || null,
        sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
        analysis: analysisResult.analysis || `Analysis completed. Extracted ${transactionCount} transactions.`
      };

      console.log(`✅ Final result: ${transactionCount} transactions extracted`);

      // Enviar progreso de transacciones encontradas
      sendSSE(controller, 'progress', {
        step: 'complete',
        message: `Análisis completo: ${transactionCount} transacciones encontradas`,
        transactionCount
      });

      // Enviar resultado final
      sendSSE(controller, 'result', {
        success: true,
        analysis: analysisResult
      });

      sendSSE(controller, 'done', {});
      controller.close();

    } catch (parseError) {
      console.error('❌ All recovery strategies failed');
      console.error('JSON parse error:', parseError.message);
      console.error('Response length:', responseText.length);
      console.error('Last 200 chars of response:', responseText.slice(-200));
      
      sendSSE(controller, 'error', {
        success: false,
        error: 'Unable to extract transactions from AI response',
        details: 'The PDF structure might be too complex or contain too many transactions.',
        technicalDetails: parseError.message
      });
      controller.close();
    }
        } catch (error) {
          console.error('Streaming error:', error);
          sendSSE(controller, 'error', {
            success: false,
            error: 'Error processing PDF',
            details: error.message
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error processing PDF', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Función para manejar análisis no-streaming (compatibilidad con llamadas antiguas)
async function handleNonStreamingAnalysis(pdfText: string, apiKey: string | undefined) {
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Lovable API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Non-streaming analysis mode');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
          content: `Extract ALL fuel transactions from this text. Extract EVERY transaction you find:

${pdfText}

Required fields: date (YYYY-MM-DD), card, unit, invoice, location_name, city, state, qty, gross_ppg, gross_amt, disc_amt, fees, total_amt

JSON format (use numbers for amounts):
{"columnsFound":["date","card"...],"hasAuthorizationCode":false,"authorizationCodeField":null,"sampleData":[{"date":"2025-01-15","card":"12345"...}],"analysis":"Found X transactions"}

CRITICAL: Extract EVERY transaction in the PDF. Do not skip any transactions.`
        }
      ],
      max_completion_tokens: 32000,
      response_format: { type: "json_object" },
      temperature: 0.1
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
  
  console.log('Analysis complete');
  
  const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
  let analysisResult;
  
  try {
    analysisResult = JSON.parse(cleanedText);
  } catch {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to parse AI response'
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
}
