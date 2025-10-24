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
    console.log('Starting PDF text analysis...');
    
    const { extractedText } = await req.json();

    if (!extractedText) {
      return new Response(
        JSON.stringify({ error: 'Extracted text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Text received, length:', extractedText.length);
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

PASO 1 - ANÁLISIS INICIAL:
Lee TODO el texto e identifica:
- ¿Dónde están las transacciones de combustible?
- ¿Cuál es la estructura de la tabla?
- ¿Qué columnas existen?

PASO 2 - EXTRACCIÓN:
Para cada transacción extrae:
- NÚMEROS DE TARJETA: busca todos los números diferentes
- UBICACIÓN: nombre de estación, ciudad y estado (separados)
- MONTOS: números completos (si ves "156.45" escribe 156.45, NO 56.45)
- FECHAS: formato YYYY-MM-DD

REGLAS CRÍTICAS:
- Lee TODOS los dígitos de los montos
- NO inventes datos
- Cada fila puede tener diferente número de tarjeta

Texto del PDF:
${extractedText}

Responde SOLO con JSON válido:
{
  "columnsFound": ["lista_de_columnas"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "número_completo",
      "unit": "unidad",
      "invoice": "factura",
      "location_name": "estación",
      "city": "ciudad",
      "state": "estado",
      "qty": galones,
      "gross_ppg": precio,
      "gross_amt": monto_bruto,
      "disc_amt": descuento,
      "fees": comisiones,
      "total_amt": total
    }
  ],
  "analysis": "Descripción breve"
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
        error: 'Error processing text', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
