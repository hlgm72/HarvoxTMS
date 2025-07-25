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
    
    const body = await req.json();
    console.log('Request body received');
    
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      console.log('No pdfBase64 provided');
      return new Response(
        JSON.stringify({ error: 'PDF base64 data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.log('No OpenAI API key found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PDF base64 length:', pdfBase64.length);
    console.log('First 20 chars of base64:', pdfBase64.substring(0, 20));

    // Usar Vision API directamente
    console.log('Processing with Vision API...');
    
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
                text: `Analiza esta imagen de documento y extrae todas las columnas y campos visibles.

                Busca especialmente:
                - authorization_code o authorization code
                - códigos de autorización
                - números de referencia
                - todos los campos y columnas visibles

                Responde SOLO con un JSON válido (sin markdown):
                {
                  "columnsFound": ["lista_de_campos"],
                  "hasAuthorizationCode": true,
                  "authorizationCodeField": "nombre_del_campo",
                  "sampleData": [{"campo": "valor"}],
                  "analysis": "descripción detallada"
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

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error', 
          details: errorText,
          status: response.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    console.log('OpenAI raw response:', responseText);

    // Limpiar y parsear respuesta
    let cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    
    // Si empieza con texto antes del JSON, intentar extraer solo el JSON
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    console.log('Attempting to parse JSON:', cleanedText);
    
    const analysisResult = JSON.parse(cleanedText);
    
    console.log('Successfully parsed result:', analysisResult);

    // Validar estructura
    const validatedResult = {
      columnsFound: Array.isArray(analysisResult.columnsFound) ? analysisResult.columnsFound : [],
      hasAuthorizationCode: Boolean(analysisResult.hasAuthorizationCode),
      authorizationCodeField: analysisResult.authorizationCodeField || null,
      sampleData: Array.isArray(analysisResult.sampleData) ? analysisResult.sampleData : [],
      analysis: analysisResult.analysis || 'Análisis completado'
    };

    return new Response(
      JSON.stringify({
        success: true,
        analysis: validatedResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error processing PDF', 
        details: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});