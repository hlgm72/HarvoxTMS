import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function extractTextFromPDF(base64: string): Promise<string> {
  try {
    // Use PDFCo's free text extraction API (no API key needed for basic extraction)
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `data:application/pdf;base64,${base64}`,
        inline: true
      })
    });

    if (!response.ok) {
      throw new Error(`PDFCo API error: ${response.status}`);
    }

    const result = await response.json();
    return result.body || '';
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

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

    console.log('PDF received, extracting text...');
    
    const extractedText = await extractTextFromPDF(pdfBase64);

    if (!extractedText || extractedText.trim().length < 50) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not extract meaningful text from PDF. The PDF might be image-based or encrypted.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Text extracted successfully, length:', extractedText.length);
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
            content: `Eres un asistente experto en análisis de documentos de combustible. Extrae datos de transacciones del siguiente texto.

PASO 1 - ANÁLISIS:
- Identifica transacciones de combustible
- Encuentra la estructura de tabla  
- Identifica columnas

PASO 2 - EXTRACCIÓN:
Para cada transacción extrae:
- Números de tarjeta (completos)
- Ubicación (estación, ciudad, estado separados)
- Montos (números completos)
- Fechas (formato YYYY-MM-DD)

REGLAS:
- Lee todos los dígitos
- NO inventes datos
- Si no encuentras un campo, usa null

Texto:
${extractedText.substring(0, 12000)}

Responde SOLO con JSON:
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
