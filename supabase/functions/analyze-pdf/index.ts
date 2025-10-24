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

    // Convert PDF to data URL for OpenAI vision
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

    console.log('Analyzing with OpenAI gpt-4o (with vision)...');

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
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un asistente experto en análisis de documentos de combustible. Tu tarea es extraer datos de transacciones de combustible de este documento PDF.

PASO 1 - ANÁLISIS INICIAL DEL DOCUMENTO:
Primero lee TODO el documento y identifica:
- ¿Dónde están las filas de transacciones de combustible?
- ¿Cuál es la estructura exacta de la tabla?
- ¿Qué columnas existen realmente?

PASO 2 - IDENTIFICACIÓN DE DATOS:
Para cada transacción de combustible extrae:
- NÚMEROS DE TARJETA: busca TODOS los números de tarjeta diferentes
  * Cada fila puede tener su propio número de tarjeta
  * NO asumas que todas usan la misma tarjeta
  * Verifica CADA FILA individualmente
- UBICACIÓN: Extrae nombre de estación, ciudad y estado por separado
  * Si está combinado (ej: "Shell - Miami, FL"), separa en name/city/state
- MONTOS: Lee los números completos exactamente como aparecen
- FECHAS: En formato MM/DD/YYYY

REGLAS CRÍTICAS:
- Lee TODOS los dígitos de los montos (si ves "156.45" NO escribas 56.45)
- Extrae el número de tarjeta completo de cada fila
- NO inventes datos que no aparezcan en el documento

Responde SOLO con JSON válido en este formato:
{
  "columnsFound": ["lista_de_columnas_reales"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre del campo o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "número_completo",
      "unit": "número_unidad",
      "invoice": "número_factura",
      "location_name": "nombre_estación",
      "city": "ciudad",
      "state": "código_estado",
      "qty": galones_numérico,
      "gross_ppg": precio_por_galón,
      "gross_amt": monto_bruto_completo,
      "disc_amt": descuento,
      "fees": comisiones,
      "total_amt": total_completo
    }
  ],
  "analysis": "Descripción breve de lo encontrado"
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: pdfDataUrl,
                  detail: 'high'
                }
              }
            ]
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
    
    console.log('OpenAI response:', responseText);

    let analysisResult;
    try {
      // Limpiar respuesta
      const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      const jsonToParse = jsonMatch ? jsonMatch[0] : cleanedText;
      analysisResult = JSON.parse(jsonToParse);

      // Validar estructura
      analysisResult = {
        columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
        hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
        authorizationCodeField: analysisResult.authorizationCodeField || null,
        sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
        analysis: analysisResult.analysis || 'Análisis completado'
      };

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response was:', responseText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse OpenAI response',
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
