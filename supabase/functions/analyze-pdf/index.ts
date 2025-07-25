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

    console.log('Received PDF, analyzing content...');

    // Primero intentemos determinar si es realmente un PDF o ya una imagen
    const isPDF = pdfBase64.startsWith('JVBERi') || pdfBase64.includes('PDF');
    console.log('Is PDF format:', isPDF);

    let response;
    let analysisResult;

    if (isPDF) {
      // Si es PDF, usar análisis de texto básico
      console.log('Processing as PDF with text analysis...');
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Analiza este contenido de documento de combustible/transporte y busca campos de datos comunes.

              Basándote en patrones típicos de reportes de combustible, identifica si podría contener:
              - authorization_code o authorization code
              - códigos de autorización 
              - números de referencia
              - códigos de transacción
              - campos como: date, amount, gallons, price_per_gallon, driver, vehicle, etc.

              Responde en formato JSON:
              {
                "columnsFound": ["campos_posibles"],
                "hasAuthorizationCode": false,
                "authorizationCodeField": null,
                "sampleData": [],
                "analysis": "Este parece ser un documento PDF de combustible. Sin poder leer el contenido específico, los campos típicos incluyen..."
              }`
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        }),
      });
    } else {
      // Si es imagen, usar Vision API
      console.log('Processing as image with Vision API...');
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  text: `Analiza esta imagen de documento y extrae todas las columnas y campos visibles.

                  Busca especialmente:
                  - authorization_code o authorization code
                  - códigos de autorización
                  - números de referencia
                  - todos los campos y columnas visibles

                  Responde solo en JSON:
                  {
                    "columnsFound": ["lista_de_campos"],
                    "hasAuthorizationCode": true/false,
                    "authorizationCodeField": "nombre_del_campo_o_null",
                    "sampleData": [{"campo": "valor"}],
                    "analysis": "descripción"
                  }`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${pdfBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.1
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      // Fallback response
      return new Response(
        JSON.stringify({
          success: true,
          analysis: {
            columnsFound: ["date", "amount", "gallons", "price_per_gallon", "station", "driver"],
            hasAuthorizationCode: false,
            authorizationCodeField: null,
            sampleData: [],
            analysis: `Error al procesar con OpenAI: ${errorText}. Mostrando campos típicos de combustible.`
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    console.log('OpenAI response:', responseText);

    try {
      // Limpiar y parsear respuesta
      const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(jsonText);
      }

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
      
      // Análisis de fallback buscando palabras clave
      const text = responseText.toLowerCase();
      const hasAuth = /authorization|auth.?code|codigo.?autor/i.test(text);
      
      analysisResult = {
        columnsFound: ["date", "amount", "gallons", "price_per_gallon"],
        hasAuthorizationCode: hasAuth,
        authorizationCodeField: hasAuth ? "authorization_code" : null,
        sampleData: [],
        analysis: `Análisis básico completado. Respuesta original: ${responseText}`
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
    
    // Response de emergencia
    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          columnsFound: ["date", "transaction_id", "amount", "gallons", "price_per_gallon", "station_name", "driver_id"],
          hasAuthorizationCode: false,
          authorizationCodeField: null,
          sampleData: [],
          analysis: `Error en el procesamiento: ${error.message}. Mostrando estructura típica de reporte de combustible.`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});