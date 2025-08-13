import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @deno-types="npm:@types/pdf-parse"
import pdfParse from "npm:pdf-parse";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Convertir base64 a buffer para pdf-parse
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    let extractedText = '';
    
    try {
      console.log('Extracting text from PDF...');
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = pdfData.text;
      console.log('PDF text extracted, length:', extractedText.length);
      console.log('First 500 chars:', extractedText.substring(0, 500));
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      return new Response(
        JSON.stringify({ error: 'Failed to extract text from PDF', details: pdfError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!extractedText.trim()) {
      return new Response(
        JSON.stringify({ error: 'No text could be extracted from the PDF' }),
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
            content: `Eres un asistente experto en contabilidad de transporte. Analiza este texto extraído de un PDF de estado de cuenta de combustible.

INSTRUCCIONES CRÍTICAS:
1. Busca ÚNICAMENTE tablas de transacciones de combustible (ignora balances, pagos, headers)
2. Identifica las columnas exactas del PDF: DATE, CARD, UNIT, INVOICE #, LOCATION NAME, ST, QTY, GROSS PPG, GROSS AMT, DISC AMT, FEES, TOTAL AMT
3. Para CARD: extrae EXACTAMENTE lo que aparece en la columna CARD del PDF - NO inventes números
4. Si no hay una columna clara de CARD, busca números de tarjeta de 4-20 dígitos en las filas de transacciones
5. NO uses códigos genéricos como "0002", "PMT" a menos que aparezcan literalmente en el PDF

INSTRUCCIONES ESPECIALES PARA MONTOS:
- Para GROSS AMT y TOTAL AMT: extrae el número completo con TODOS los dígitos y decimales exactos como aparecen en el PDF
- NO redondees ni cortes números - mantén la precisión exacta del PDF
- Si un monto aparece como "156.45", usa 156.45, NO 56.45
- Si un monto aparece como "1,234.56", usa 1234.56
- Presta especial atención a los números de más de 2 dígitos antes del decimal

FORMATO DE SALIDA - Solo extrae datos que REALMENTE existan en el PDF:

Texto del PDF:
${extractedText}

ANTES de responder con JSON, primero identifica:
- ¿Dónde están las transacciones de combustible en el texto?
- ¿Cuáles son las columnas exactas que aparecen?
- ¿Qué números aparecen realmente en la columna de tarjetas?
- ¿Cuáles son los montos COMPLETOS sin cortar?

Responde SOLO con JSON válido en este formato:
{
  "columnsFound": ["lista_de_columnas_reales_encontradas"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre del campo si existe o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "card": "número_exacto_que_aparece_en_el_PDF",
      "unit": "número de unidad exacto",
      "invoice": "número de factura exacto",
      "location_name": "nombre exacto de la estación",
      "state": "código de estado",
      "qty": cantidad_galones_numerica_exacta,
      "gross_ppg": precio_por_galón_numerico_exacto,
      "gross_amt": monto_bruto_numerico_COMPLETO,
      "disc_amt": descuento_numerico_exacto,
      "fees": comisiones_numericas_exactas,
      "total_amt": total_final_numerico_COMPLETO
    }
  ],
  "analysis": "Descripción de qué columnas encontraste, de dónde sacaste los números de tarjeta, y cómo identificaste los montos completos"
}

CRÍTICO: 
- Solo extrae datos que REALMENTE aparezcan en el texto del PDF. NO inventes números.
- MANTÉN los montos COMPLETOS sin cortar dígitos.`
          }
        ],
        max_tokens: 2000,
        temperature: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
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