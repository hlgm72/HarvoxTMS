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
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un asistente experto en análisis de documentos de combustible. Analiza esta imagen de un documento y extrae TODAS las transacciones de combustible que veas.

CRÍTICO - INSTRUCCIONES DE EXTRACCIÓN:
1. Lee CADA FILA de la tabla cuidadosamente
2. Extrae TODAS las transacciones que aparezcan (no solo una muestra)
3. Para números de tarjeta: extrae el número COMPLETO de CADA fila individual
4. Para ubicaciones: separa nombre de estación, ciudad y estado
5. Para montos: escribe el número COMPLETO (si ves $156.45, escribe 156.45 NO 56.45)
6. Para fechas: convierte a formato YYYY-MM-DD

REGLAS IMPORTANTES:
- NO asumas que todas las filas tienen el mismo número de tarjeta
- Verifica CADA fila individualmente
- Lee TODOS los dígitos de los montos
- NO inventes datos que no veas

Responde SOLO con JSON válido:
{
  "columnsFound": ["lista_de_todas_las_columnas_que_ves"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre_del_campo_de_autorización o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "número_de_tarjeta_completo_de_esta_fila",
      "unit": "número_de_unidad",
      "invoice": "número_de_factura",
      "location_name": "nombre_exacto_de_la_estación",
      "city": "ciudad",
      "state": "código_de_estado_2_letras",
      "qty": cantidad_galones_número,
      "gross_ppg": precio_por_galón_número,
      "gross_amt": monto_bruto_número_COMPLETO,
      "disc_amt": descuento_número,
      "fees": comisiones_número,
      "total_amt": total_número_COMPLETO
    }
  ],
  "analysis": "Descripción de cuántas transacciones encontraste y de qué columnas"
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
    
    console.log('OpenAI analysis complete');

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
