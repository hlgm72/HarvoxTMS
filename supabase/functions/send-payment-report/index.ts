import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Function called with method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body))

    // Paso 1: Importar Resend dinámicamente
    console.log('Step 1: Importing Resend...')
    const { Resend } = await import("npm:resend@2.0.0")
    console.log('Step 1: SUCCESS - Resend imported')

    // Paso 2: Verificar API key
    const apiKey = Deno.env.get("RESEND_API_KEY")
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not found')
    }
    console.log('Step 2: SUCCESS - API key found')

    // Paso 3: Inicializar Resend
    const resend = new Resend(apiKey)
    console.log('Step 3: SUCCESS - Resend initialized')

    // Paso 4: Enviar email simple
    console.log('Step 4: Sending email...')
    const emailResult = await resend.emails.send({
      from: "FleetNest <noreply@fleetnest.app>",
      to: ["hlgm72@gmail.com"],
      subject: "Test Payment Report",
      html: `
        <h2>Test Payment Report</h2>
        <p>This is a test email sent at ${new Date().toISOString()}</p>
        <p>Request data: ${JSON.stringify(body, null, 2)}</p>
      `
    })

    if (emailResult.error) {
      console.error('Email error:', emailResult.error)
      throw new Error(`Email failed: ${emailResult.error.message}`)
    }

    console.log('Step 4: SUCCESS - Email sent', emailResult.data?.id)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test email sent successfully',
      email_id: emailResult.data?.id,
      recipient: 'hlgm72@gmail.com'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error caught:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})