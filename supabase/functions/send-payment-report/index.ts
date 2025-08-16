import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface EmailRequest {
  to: string
  subject: string
  html: string
  pdf_data?: number[] // PDF como array de bytes
  pdf_filename?: string
}

serve(async (req) => {
  console.log('Email function called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, subject, html, pdf_data, pdf_filename }: EmailRequest = await req.json()
    
    const emailOptions: any = {
      from: "FleetNest TMS <noreply@fleetnest.app>",
      to: [to],
      subject,
      html
    }

    // Si hay PDF, agregarlo como adjunto
    if (pdf_data && pdf_filename) {
      emailOptions.attachments = [{
        filename: pdf_filename,
        content: pdf_data
      }]
    }

    const result = await resend.emails.send(emailOptions)

    if (result.error) {
      throw new Error(result.error.message)
    }

    return new Response(JSON.stringify({
      success: true,
      email_id: result.data?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})