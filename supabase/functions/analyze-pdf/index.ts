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

    console.log('Analyzing PDF content with OpenAI...');

    // Usar Vision API con el PDF como imagen
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
            content: [
              {
                type: 'text',
                text: `Eres un experto en análisis de documentos de combustible y transporte. 
                Analiza esta imagen/documento y extrae TODAS las columnas y campos de datos que veas.
                
                Presta especial atención a encontrar:
                - authorization_code o authorization code
                - cualquier código de autorización
                - números de referencia
                - códigos de transacción
                
                Devuelve la respuesta SOLO en formato JSON válido con esta estructura exacta:
                {
                  "columnsFound": ["lista", "de", "columnas", "encontradas"],
                  "hasAuthorizationCode": true/false,
                  "authorizationCodeField": "nombre del campo si existe o null",
                  "sampleData": [{"campo1": "valor1", "campo2": "valor2"}],
                  "analysis": "descripción detallada de lo que encontraste"
                }
                
                IMPORTANTE: Responde SOLAMENTE con el JSON, sin texto adicional.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${pdfBase64}`
                }
              }
            ]
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
        JSON.stringify({ error: 'Error analyzing document', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const analysisText = data.choices[0].message.content;
    console.log('Raw analysis text:', analysisText);
    
    let analysisResult;
    try {
      // Limpiar el texto para extraer solo el JSON
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      
      // Intentar encontrar el JSON en el texto
      let jsonToparse = cleanedText;
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonToParse = jsonMatch[0];
      }
      
      analysisResult = JSON.parse(jsonToparse);
      
      // Validar y corregir la estructura
      analysisResult = {
        columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
        hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
        authorizationCodeField: analysisResult.authorizationCodeField || null,
        sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
        analysis: analysisResult.analysis || 'Análisis completado'
      };
      
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw response text:', analysisText);
      
      // Fallback: intentar extraer información manualmente del texto
      const hasAuthCode = /authorization.{0,20}code/i.test(analysisText);
      const columns = [];
      
      // Buscar posibles columnas mencionadas
      const columnMatches = analysisText.match(/columna[s]?[:\s]*([^.]+)/gi);
      if (columnMatches) {
        columnMatches.forEach(match => {
          const cleanMatch = match.replace(/columna[s]?[:\s]*/gi, '').trim();
          if (cleanMatch && cleanMatch.length < 100) {
            columns.push(cleanMatch);
          }
        });
      }
      
      analysisResult = {
        columnsFound: columns,
        hasAuthorizationCode: hasAuthCode,
        authorizationCodeField: hasAuthCode ? "authorization_code" : null,
        sampleData: [],
        analysis: `Análisis de respuesta de texto: ${analysisText}`,
        parseError: parseError.message,
        rawResponse: analysisText
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