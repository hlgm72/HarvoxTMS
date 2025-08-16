import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Payment report function started ===');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request handled');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Non-POST method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Processing POST request...');
    const body = await req.json();
    console.log('Request body received:', body);

    // Test 1: Basic response
    console.log('Step 1: Basic response test - SUCCESS');

    // Test 2: Import Resend
    console.log('Step 2: Testing Resend import...');
    const { Resend } = await import("npm:resend@2.0.0");
    console.log('Step 2: Resend import - SUCCESS');

    // Test 3: Check environment variable
    console.log('Step 3: Testing environment variable...');
    const resendKey = Deno.env.get("RESEND_API_KEY");
    console.log('Step 3: RESEND_API_KEY exists:', !!resendKey);
    console.log('Step 3: RESEND_API_KEY length:', resendKey?.length || 0);

    // Test 4: Initialize Resend
    console.log('Step 4: Testing Resend initialization...');
    const resend = new Resend(resendKey);
    console.log('Step 4: Resend initialization - SUCCESS');

    // Test 5: Import Supabase
    console.log('Step 5: Testing Supabase import...');
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.50.3");
    console.log('Step 5: Supabase import - SUCCESS');

    // Test 6: Initialize Supabase
    console.log('Step 6: Testing Supabase initialization...');
    const supabase = createClient(
      "https://htaotttcnjxqzpsrqwll.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.mSGdCUhKfKlE_gJ45lBjh9tZq-k4tHU25dJMLdPTU74"
    );
    console.log('Step 6: Supabase initialization - SUCCESS');

    // Test 7: Simple email send
    console.log('Step 7: Testing simple email send...');
    const emailResult = await resend.emails.send({
      from: "FleetNest <noreply@fleetnest.app>",
      to: ["hlgm72@gmail.com"],
      subject: "Test Payment Report",
      html: `
        <h1>Test Payment Report</h1>
        <p>This is a test email sent at ${new Date().toISOString()}</p>
        <p>Request data: ${JSON.stringify(body, null, 2)}</p>
      `,
    });

    console.log('Step 7: Email result:', JSON.stringify(emailResult, null, 2));

    if (emailResult.error) {
      console.error('Email send error:', emailResult.error);
      throw new Error(`Email failed: ${JSON.stringify(emailResult.error)}`);
    }

    console.log('=== All tests passed successfully ===');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test email sent successfully',
      email_id: emailResult.data?.id,
      recipient: 'hlgm72@gmail.com',
      tests_passed: 7,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR DETAILS ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('=== END ERROR DETAILS ===');
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      error_name: error.name,
      error_stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});