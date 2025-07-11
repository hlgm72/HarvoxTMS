import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user is authenticated and is a superadmin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    // Check if user is superadmin
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc(
      "is_superadmin",
      { user_id_param: user.id }
    );

    if (roleError || !isSuperAdmin) {
      throw new Error("Access denied. Superadmin role required.");
    }

    const { companyId, email, companyName }: InvitationRequest = await req.json();

    // Validate input
    if (!companyId || !email || !companyName) {
      throw new Error("Missing required fields: companyId, email, companyName");
    }

    // Check if company already has an owner
    const { data: hasOwner, error: ownerCheckError } = await supabase.rpc(
      "company_has_owner",
      { company_id_param: companyId }
    );

    if (ownerCheckError) {
      throw new Error(`Error checking company owner: ${ownerCheckError.message}`);
    }

    if (hasOwner) {
      throw new Error("This company already has a Company Owner");
    }

    // Check if there's already a pending invitation for this email and company
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from("user_invitations")
      .select("id, expires_at, accepted_at")
      .eq("company_id", companyId)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invitationCheckError && invitationCheckError.code !== "PGRST116") {
      throw new Error(`Error checking existing invitations: ${invitationCheckError.message}`);
    }

    if (existingInvitation) {
      throw new Error("There is already a pending invitation for this email and company");
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    
    // Create invitation record
    const { data: invitation, error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        company_id: companyId,
        email: email,
        invited_by: user.id,
        invitation_token: invitationToken,
        role: "company_owner"
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error creating invitation: ${insertError.message}`);
    }

    // Send invitation email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const invitationUrl = `${req.headers.get("origin")}/invitation/${invitationToken}`;

    const emailResponse = await resend.emails.send({
      from: "FleetNest <noreply@resend.dev>",
      to: [email],
      subject: `You've been invited to manage ${companyName} on FleetNest`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FleetNest</h1>
            <p style="color: #666; margin: 5px 0;">Fleet Management Platform</p>
          </div>
          
          <h2 style="color: #2563eb;">Welcome to FleetNest!</h2>
          
          <p>You have been invited to become the Company Owner for <strong>${companyName}</strong>.</p>
          
          <p>As a Company Owner, you will be able to:</p>
          <ul style="color: #444; line-height: 1.6;">
            <li>Manage your company's fleet operations</li>
            <li>Add and manage drivers</li>
            <li>Track loads and manage payments</li>
            <li>Access comprehensive reporting tools</li>
          </ul>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              Accept Invitation & Set Password
            </a>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              <strong>⏰ Important:</strong> This invitation will expire in 7 days. 
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            FleetNest - Professional Fleet Management Platform<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
    });

    console.log("Resend API response:", {
      success: !!emailResponse.data,
      messageId: emailResponse.data?.id,
      error: emailResponse.error,
      to: email,
      company: companyName
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company Owner invitation sent successfully",
        invitationId: invitation.id,
        email: email,
        companyName: companyName,
        expiresAt: invitation.expires_at
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