import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { CompanyOwnerInvite } from "../_shared/email-templates/CompanyOwnerInvite.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  companyId: string;
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
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
    const { companyId, email, companyName, firstName, lastName } = requestBody as InvitationRequest;

    console.log("Request data:", { companyId, email, companyName, firstName, lastName });

    // Validate input
    if (!companyId || !email || !companyName || !firstName || !lastName) {
      throw new Error("Missing required fields: companyId, email, companyName, firstName, lastName");
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
        invited_by: user.id,
        first_name: firstName,
        last_name: lastName
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
    
    // Get the frontend URL from environment or use the referer header
    const refererHeader = req.headers.get("referer") || "";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || 
                       (refererHeader ? new URL(refererHeader).origin : "http://localhost:3000");
    
    const invitationUrl = `${frontendUrl}/invitation/${invitationToken}`;
    
    try {
      // Render the modern React email template
      const emailHtml = await renderAsync(
        React.createElement(CompanyOwnerInvite, {
          recipientName: firstName,
          companyName: companyName,
          invitationUrl: invitationUrl
        })
      );

      const emailResponse = await resend.emails.send({
        from: "FleetNest <noreply@fleetnest.app>",
        to: [email],
        subject: `Invitación para administrar ${companyName} - FleetNest`,
        html: emailHtml,
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