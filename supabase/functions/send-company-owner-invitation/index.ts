import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  companyId: string;
  email: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== INVITATION HANDLER STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting invitation process...");
    
    // Initialize Supabase client with service role (admin access)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Supabase client initialized");

    // Get the authorization header for user verification
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Parse request body
    const requestBody = await req.json();
    const { companyId, email, companyName } = requestBody as InvitationRequest;

    console.log("Request data:", { companyId, email, companyName });

    // Validate input
    if (!companyId || !email || !companyName) {
      throw new Error("Missing required fields: companyId, email, companyName");
    }

    // Verify the user token (but use service role for database operations)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    console.log("User authenticated:", user.id);

    // Check if user is superadmin
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc(
      "is_superadmin",
      { user_id_param: user.id }
    );

    if (roleError || !isSuperAdmin) {
      throw new Error("Access denied. Superadmin role required.");
    }

    console.log("Superadmin validation passed");

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation record (using service role, so no RLS restrictions)
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .insert({
        company_id: companyId,
        email: email.toLowerCase(),
        invitation_token: invitationToken,
        role: 'company_owner',
        invited_by: user.id
      })
      .select('id')
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }

    console.log("Invitation created successfully:", invitation.id);

    // Send invitation email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const invitationUrl = `${Deno.env.get("SUPABASE_URL")}/invitation?token=${invitationToken}`;
    
    try {
      const emailResponse = await resend.emails.send({
        from: "FleetNest <noreply@fleetnest.app>",
        to: [email],
        subject: `Invitation to manage ${companyName} - FleetNest`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; margin-bottom: 24px;">Company Owner Invitation</h1>
            
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              You have been invited to become the Company Owner for <strong>${companyName}</strong> on FleetNest.
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              Click the button below to set up your account and start managing your fleet:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              FleetNest - Professional Fleet Management Platform
            </p>
          </div>
        `,
      });

      console.log("Email sent successfully:", emailResponse);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the whole operation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company Owner invitation created successfully",
        data: { 
          invitationId: invitation.id,
          companyId, 
          email, 
          companyName
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-company-owner-invitation:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error"
      }),
      {
        status: 400,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);