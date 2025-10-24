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
    console.log('Starting PDF analysis...');
    
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'PDF base64 data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PDF received, length:', pdfBase64.length);

    // Simple text extraction from PDF bytes
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let extractedText = decoder.decode(pdfBytes);
    
    // Clean up the extracted text - remove binary junk, keep readable text
    extractedText = extractedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Text extracted, length:', extractedText.length);
    console.log('Sample:', extractedText.substring(0, 500));

    if (!extractedText || extractedText.length < 100) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not extract readable text from PDF. The PDF might be image-based or encrypted.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Eres un asistente experto en análisis de documentos de combustible. Tu tarea es extraer datos de transacciones de combustible del siguiente texto extraído de un PDF.

IMPORTANTE: El texto puede estar desordenado o contener caracteres extraños. Busca patrones y datos coherentes.

PASO 1 - ANÁLISIS:
- Identifica transacciones de combustible
- Encuentra la estructura de tabla
- Identifica columnas

PASO 2 - EXTRACCIÓN:
Para cada transacción extrae:
- Números de tarjeta (completos)
- Ubicación (estación, ciudad, estado separados)
- Montos (números completos, si ves "156.45" escribe 156.45)
- Fechas (formato YYYY-MM-DD)

REGLAS:
- Lee todos los dígitos de montos
- NO inventes datos
- Si no encuentras un campo, usa null

Texto del PDF:
${extractedText.substring(0, 15000)}

Responde SOLO con JSON válido:
{
  "columnsFound": ["columnas"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "número",
      "unit": "unidad",
      "invoice": "factura",
      "location_name": "estación",
      "city": "ciudad",
      "state": "estado",
      "qty": galones,
      "gross_ppg": precio,
      "gross_amt": bruto,
      "disc_amt": descuento,
      "fees": comisiones,
      "total_amt": total
    }
  ],
  "analysis": "Breve descripción"
}`
          }
        ],
        max_tokens: 2000,
        temperature: 0
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
    
    console.log('OpenAI response received');

    let analysisResult;
    try {
      const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      const jsonToParse = jsonMatch ? jsonMatch[0] : cleanedText;
      analysisResult = JSON.parse(jsonToParse);

      analysisResult = {
        columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
        hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
        authorizationCodeField: analysisResult.authorizationCodeField || null,
        sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
        analysis: analysisResult.analysis || 'Análisis completado'
      };

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI response',
          details: parseError.message,
          rawResponse: responseText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
