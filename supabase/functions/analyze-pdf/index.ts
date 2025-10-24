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

    console.log('PDF received, converting for OpenAI...');
    
    // Convert PDF pages to images and send to OpenAI vision
    // Use a PDF to image conversion service
    const pdfToImageResponse = await fetch('https://v2.convertapi.com/convert/pdf/to/jpg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Name: 'document.pdf',
              Data: pdfBase64
            }
          },
          {
            Name: 'PageRange',
            Value: '1'
          }
        ]
      })
    });

    if (!pdfToImageResponse.ok) {
      console.error('PDF conversion error:', await pdfToImageResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to convert PDF to image for analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversionResult = await pdfToImageResponse.json();
    const imageBase64 = conversionResult.Files[0].FileData;

    console.log('PDF converted to image, analyzing with OpenAI Vision...');

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

IMPORTANTE:
- Lee CUIDADOSAMENTE cada fila de la tabla
- Extrae TODAS las transacciones que aparezcan
- Para números de tarjeta: extrae el número completo de CADA fila
- Para ubicaciones: separa el nombre de la estación, ciudad y estado
- Para montos: escribe el número completo (si ves $156.45, escribe 156.45)
- Para fechas: usa formato YYYY-MM-DD

Responde SOLO con JSON válido en este formato:
{
  "columnsFound": ["lista de columnas que ves en el documento"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre del campo de autorización o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "número de tarjeta completo",
      "unit": "número de unidad",
      "invoice": "número de factura",
      "location_name": "nombre de la estación",
      "city": "ciudad",
      "state": "código de estado (TX, FL, etc)",
      "qty": cantidad_galones_número,
      "gross_ppg": precio_por_galón_número,
      "gross_amt": monto_bruto_número_completo,
      "disc_amt": descuento_número,
      "fees": comisiones_número,
      "total_amt": total_número_completo
    }
  ],
  "analysis": "Breve descripción de lo que encontraste"
}

NO inventes datos. Solo extrae lo que REALMENTE ves en el documento.`
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
