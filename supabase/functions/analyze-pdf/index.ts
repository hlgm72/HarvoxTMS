import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Decodificar el PDF para extraer texto
    let pdfText = '';
    try {
      // Convertir base64 a texto para buscar patrones
      const binaryString = atob(pdfBase64);
      
      // Buscar patrones comunes en PDFs de combustible
      const patterns = [
        /authorization.{0,10}code/gi,
        /auth.{0,5}code/gi,
        /reference.{0,10}number/gi,
        /transaction.{0,10}id/gi,
        /card.{0,10}number/gi,
        /driver/gi,
        /vehicle/gi,
        /gallons/gi,
        /amount/gi,
        /date/gi,
        /station/gi,
        /pump/gi
      ];

      let foundFields = [];
      patterns.forEach((pattern, index) => {
        const matches = binaryString.match(pattern);
        if (matches) {
          foundFields.push(matches[0]);
        }
      });

      pdfText = `PDF content analysis - Found potential fields: ${foundFields.join(', ')}`;
      
    } catch (error) {
      console.log('PDF decoding failed:', error);
      pdfText = 'PDF content could not be decoded for pattern analysis';
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
            content: `Eres un experto en análisis de documentos de combustible y transporte. 

            Información del documento: "${pdfText}"

            Basándote en esta información y tu conocimiento de documentos de combustible típicos, analiza qué campos podrían estar presentes.

            Busca especialmente:
            - authorization_code o authorization code
            - códigos de autorización
            - números de referencia
            - códigos de transacción

            También incluye campos típicos de reportes de combustible como:
            - date, transaction_date
            - amount, total_amount
            - gallons, gallons_purchased
            - price_per_gallon
            - station_name, station
            - driver_name, driver_id
            - vehicle_number, truck_number
            - card_number
            - reference_number

            Responde SOLO con JSON válido:
            {
              "columnsFound": ["lista_de_campos_encontrados_y_típicos"],
              "hasAuthorizationCode": true/false,
              "authorizationCodeField": "authorization_code si existe o null",
              "sampleData": [{"campo": "valor_ejemplo"}],
              "analysis": "Análisis del documento de combustible basado en patrones encontrados y campos típicos"
            }`
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
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
      
      // Fallback con análisis básico
      const hasAuth = /authorization|auth.?code/i.test(pdfText);
      
      analysisResult = {
        columnsFound: [
          "date", "transaction_date", "amount", "total_amount", 
          "gallons", "gallons_purchased", "price_per_gallon",
          "station_name", "driver_name", "vehicle_number", "card_number"
        ],
        hasAuthorizationCode: hasAuth,
        authorizationCodeField: hasAuth ? "authorization_code" : null,
        sampleData: [
          {"date": "2025-07-14", "amount": "150.25", "gallons": "45.5"},
          {"station": "Shell", "driver": "John Doe", "vehicle": "T001"}
        ],
        analysis: `Análisis de PDF de combustible. Patrones encontrados: ${pdfText}. Estructura típica incluye campos de fecha, cantidad, galones, estación y conductor.`
      };
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