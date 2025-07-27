import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
    
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not found in environment variables')
    }

    const prompt = `
    Necesito investigar las mejores opciones para implementar auto-completado de ciudad y estado basado en ZIP code para una aplicación web React/TypeScript. Por favor investiga:

    1. APIs públicas disponibles (gratuitas y de pago):
       - USPS API
       - ZipCodeAPI.com
       - PostalPinCode
       - OpenZip
       - Otras opciones relevantes

    2. Datasets estáticos:
       - US ZIP Code Database
       - Census.gov datasets
       - Otras fuentes confiables

    3. Para cada opción evalúa:
       - Costo (gratis vs pago)
       - Límites de uso
       - Precisión de datos
       - Facilidad de implementación
       - Mantenimiento de datos

    4. Recomendación específica para un proyecto que usa:
       - React/TypeScript
       - Supabase como backend
       - Necesita soporte para ZIP codes de Estados Unidos

    Sé específico sobre costos, límites y URLs de las APIs.
    `

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en desarrollo web y APIs. Proporciona información técnica precisa, actualizada y detallada sobre opciones de APIs y datasets para ZIP codes de Estados Unidos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content

    return new Response(
      JSON.stringify({ 
        success: true, 
        research: result,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in research-zipcode-options:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})