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
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'user',
            content: `Eres un asistente experto en contabilidad de transporte. Analiza este texto extraído de un PDF de estado de cuenta de combustible.

INSTRUCCIONES ESPECÍFICAS:
1. Busca tablas de transacciones de combustible
2. Identifica TODAS las columnas disponibles en las tablas
3. Extrae TODAS las filas de transacciones, no solo muestras

Texto del PDF:
${extractedText}

Responde SOLO con JSON válido en este formato exacto:
{
  "columnsFound": ["DATE", "CATEGORY", "DESCRIPTION", "CARD", "UNIT", "PROMPT_DATA", "INVOICE_CHECK", "LOC", "LOCATION_NAME", "ST", "QTY", "GROSS_PPG", "SALES_TAX", "FED_TAX", "GROSS_AMT", "DISC_AMT", "FEES", "TOTAL"],
  "hasAuthorizationCode": true/false,
  "authorizationCodeField": "nombre del campo si existe o null",
  "sampleData": [
    {
      "date": "YYYY-MM-DD",
      "category": "tipo de categoría",
      "description": "descripción completa",
      "card": "últimos 4 dígitos",
      "unit": "número de unidad",
      "prompt_data": "datos de prompt",
      "invoice_check": "número de factura/cheque",
      "loc": "número de ubicación",
      "location_name": "nombre completo de ubicación",
      "state": "código de estado",
      "qty": cantidad_galones,
      "gross_ppg": precio_por_galón,
      "sales_tax": impuesto_ventas,
      "fed_tax": impuesto_federal,
      "gross_amt": monto_bruto,
      "disc_amt": descuento,
      "fees": comisiones,
      "total": total_final
    }
  ],
  "analysis": "Análisis detallado"
}

CRÍTICO: Extrae TODAS las transacciones de combustible que veas en las tablas, no omitas ninguna.`
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