console.log('=== Starting function definition ===');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('=== CORS headers defined ===');

Deno.serve(async (req) => {
  console.log('=== Function called ===', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('=== OPTIONS handled ===');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('=== Non-POST method ===');
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('=== Starting POST processing ===');
    const body = await req.json();
    console.log('=== Body parsed ===', body);

    console.log('=== About to return success ===');
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Ultra basic test successful',
      timestamp: new Date().toISOString(),
      received: body
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR CAUGHT ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

console.log('=== Function definition complete ===');