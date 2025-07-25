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
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'PDF base64 data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing PDF with OpenAI Vision API...');

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
            Analiza este documento y extrae TODAS las columnas y campos de datos que veas.
            
            Presta especial atención a encontrar:
            - authorization_code o authorization code
            - cualquier código de autorización
            - números de referencia
            - códigos de transacción
            
            Devuelve la respuesta en formato JSON con esta estructura:
            {
              "columnsFound": ["lista", "de", "columnas", "encontradas"],
              "hasAuthorizationCode": boolean,
              "authorizationCodeField": "nombre del campo si existe",
              "sampleData": [{"campo1": "valor1", "campo2": "valor2"}],
              "analysis": "descripción detallada de lo que encontraste"
            }
            
            Documento en base64: ${pdfBase64}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error analyzing PDF', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const analysisText = data.choices[0].message.content;
    
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        analysisResult = {
          columnsFound: [],
          hasAuthorizationCode: false,
          authorizationCodeField: null,
          sampleData: [],
          analysis: analysisText
        };
      }
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      analysisResult = {
        columnsFound: [],
        hasAuthorizationCode: false,
        authorizationCodeField: null,
        sampleData: [],
        analysis: analysisText,
        parseError: parseError.message
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-pdf function:', error);
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