import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetEmailRequest {
  email: string;
  lang?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, lang = 'es' }: ResetEmailRequest = await req.json();

    console.log('Sending reset email to:', email);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error checking users:', userError);
      throw new Error('Error checking user existence');
    }

    const userExists = users.users.some(user => user.email === email.toLowerCase());
    if (!userExists) {
      console.log('User not found, but returning success for security');
      // Return success anyway to prevent email enumeration
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Reset email sent successfully if user exists"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Generate secure token
    const resetToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    
    // Store token in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_email: email.toLowerCase(),
        token: resetToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      });

    if (tokenError) {
      console.error('Error storing reset token:', tokenError);
      throw new Error('Error creating reset token');
    }

    console.log('Reset token created successfully');

    // Generate reset URL with token
    const refererHeader = req.headers.get("referer") || "";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || 
                       (refererHeader ? new URL(refererHeader).origin : "http://localhost:3000");
    
    const resetUrl = `${frontendUrl}/auth?token=${resetToken}`;

    // Email templates based on language
    const templates = {
      es: {
        subject: "Restablecer contraseña - FleetNest",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">FleetNest</h1>
              <p style="color: #6b7280; margin: 5px 0;">Gestión de Flotas Inteligente</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Restablecer tu contraseña</h2>
              
              <p style="color: #4b5563; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta de FleetNest.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); 
                          color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; 
                          font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  Restablecer Contraseña
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
                <span style="word-break: break-all; color: #2563eb;">${resetUrl}</span>
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Si no solicitaste este cambio, puedes ignorar este email de forma segura.<br>
                  Este enlace expirará en 1 hora por motivos de seguridad.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 12px;">
                © 2025 FleetNest. Gestión de flotas de transporte.
              </p>
            </div>
          </div>
        `
      },
      en: {
        subject: "Reset Password - FleetNest",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">FleetNest</h1>
              <p style="color: #6b7280; margin: 5px 0;">Intelligent Fleet Management</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Reset your password</h2>
              
              <p style="color: #4b5563; line-height: 1.6;">
                We received a request to reset the password for your FleetNest account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); 
                          color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; 
                          font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you can't click the button, copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #2563eb;">${resetUrl}</span>
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  If you didn't request this change, you can safely ignore this email.<br>
                  This link will expire in 1 hour for security reasons.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 12px;">
                © 2025 FleetNest. Transportation fleet management.
              </p>
            </div>
          </div>
        `
      }
    };

    const template = templates[lang as keyof typeof templates] || templates.es;

    const emailResponse = await resend.emails.send({
      from: "FleetNest <noreply@fleetnest.app>",
      to: [email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Reset email sent successfully",
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reset-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);