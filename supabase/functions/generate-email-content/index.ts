import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailContentRequest {
  driverName: string;
  companyName: string;
  periodStart: string;
  periodEnd: string;
  netPayment: number;
  totalLoads: number;
  totalMiles: number;
  totalRevenue: number;
  totalExpenses: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailContentRequest = await req.json();

    const prompt = `Generate a professional, well-formatted HTML email for a truck driver payment report with the following details:

Driver: ${data.driverName}
Company: ${data.companyName}
Period: ${data.periodStart} to ${data.periodEnd}
Net Payment: $${data.netPayment.toFixed(2)}
Total Loads: ${data.totalLoads}
Total Miles: ${data.totalMiles}
Total Revenue: $${data.totalRevenue.toFixed(2)}
Total Expenses: $${data.totalExpenses.toFixed(2)}

Requirements:
- Professional HTML email format with inline CSS
- FleetNest TMS branding (use blue and green color scheme)
- Responsive design that works on mobile
- Include a summary table with key metrics
- Warm, professional tone in Spanish
- Clear call-to-action about the PDF attachment
- Contact information for support
- Use modern, clean design with good typography
- Include company header/branding section
- Make it visually appealing with proper spacing and colors

The email should feel premium and professional, representing a modern fleet management company.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert email designer who creates professional, visually appealing HTML emails for business communications. Always include complete HTML structure with inline CSS for maximum compatibility.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const apiData = await response.json();
    const generatedHTML = apiData.choices[0].message.content;

    return new Response(JSON.stringify({ html: generatedHTML }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-email-content function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});