import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un experto en expresiones regulares. Tu tarea es convertir descripciones en lenguaje natural de formatos de números en expresiones regulares válidas de JavaScript.

IMPORTANTE: 
- Devuelve SOLO el patrón regex sin delimitadores (sin / al inicio o final)
- No incluyas flags (como /g, /i)
- Usa ^ al inicio y $ al final para coincidencia exacta
- Valida que el regex sea correcto

Ejemplos:
Usuario: "2 dígitos, guion, 3 dígitos mínimo, opcionalmente 2 letras"
Respuesta: ^\\d{2}-\\d{3,}[A-Z]{0,2}$

Usuario: "Empieza con las letras FL seguido de 4 números"
Respuesta: ^FL\\d{4}$

Usuario: "4 dígitos del año, guion, 3 dígitos secuenciales"
Respuesta: ^\\d{4}-\\d{3}$`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_regex_pattern",
              description: "Genera un patrón regex a partir de una descripción en lenguaje natural",
              parameters: {
                type: "object",
                properties: {
                  pattern: {
                    type: "string",
                    description: "El patrón regex sin delimitadores ni flags"
                  },
                  explanation: {
                    type: "string",
                    description: "Explicación breve de qué valida el patrón"
                  },
                  examples: {
                    type: "object",
                    properties: {
                      valid: {
                        type: "array",
                        items: { type: "string" },
                        description: "Exactamente 3 ejemplos de números válidos"
                      },
                      invalid: {
                        type: "array",
                        items: { type: "string" },
                        description: "Exactamente 3 ejemplos de números inválidos"
                      }
                    },
                    required: ["valid", "invalid"]
                  }
                },
                required: ["pattern", "explanation", "examples"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_regex_pattern" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Por favor añade fondos a tu workspace de Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Error en AI gateway");
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No se pudo generar el patrón");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Validar que el regex sea válido
    try {
      new RegExp(result.pattern);
    } catch (e) {
      throw new Error("El patrón generado no es válido");
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
