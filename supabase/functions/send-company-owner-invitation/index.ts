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
  console.log("=== INVITATION HANDLER STARTED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting invitation process...");
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Supabase client initialized");

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      throw new Error("No authorization header");
    }

    console.log("Authorization header found");

    // Verify the user is authenticated and is a superadmin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Authentication failed:", userError);
      throw new Error("Invalid authentication");
    }

    console.log("User authenticated:", user.id);

    // Check if user is superadmin
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc(
      "is_superadmin",
      { user_id_param: user.id }
    );

    console.log("Superadmin check result:", { isSuperAdmin, roleError });

    if (roleError || !isSuperAdmin) {
      console.error("Access denied. User is not superadmin:", { roleError, isSuperAdmin });
      throw new Error("Access denied. Superadmin role required.");
    }

    console.log("Superadmin validation passed!");

    // Parse request body
    console.log("Parsing request body...");
    const requestBody = await req.json();
    console.log("Raw request body:", requestBody);
    
    const { companyId, email, companyName } = requestBody as InvitationRequest;
    console.log("Parsed data:", { companyId, email, companyName });

    // Validate input
    if (!companyId || !email || !companyName) {
      console.error("Missing required fields:", { companyId: !!companyId, email: !!email, companyName: !!companyName });
      throw new Error("Missing required fields: companyId, email, companyName");
    }

    console.log("Input validation passed");

    // TEMP: Skip owner check to isolate the issue
    console.log("Skipping owner check for debugging...");

    // Check if invitation already exists for this email/company
    console.log("Checking for existing invitation...");
    const { data: existingInvitations, error: invitationCheckError } = await supabase
      .from('user_invitations')
      .select('id, expires_at, accepted_at')
      .eq('company_id', companyId)
      .eq('email', email.toLowerCase())
      .eq('role', 'company_owner');

    console.log("Invitation check result:", { existingInvitations, invitationCheckError });

    if (invitationCheckError) {
      console.error("Error checking existing invitations:", invitationCheckError);
      throw new Error(`Database error: ${invitationCheckError.message}`);
    }

    // Check for active (non-expired, non-accepted) invitations
    const activeInvitations = existingInvitations?.filter(inv => 
      !inv.accepted_at && new Date(inv.expires_at) > new Date()
    ) || [];

    if (activeInvitations.length > 0) {
      console.error("Active invitation already exists");
      throw new Error("An active invitation already exists for this email and company");
    }

    console.log("No conflicting invitations found");

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    console.log("Generated invitation token");

    // Create invitation record
    console.log("Creating invitation record...");
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .insert({
        company_id: companyId,
        email: email.toLowerCase(),
        invitation_token: invitationToken,
        role: 'company_owner',
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select('id')
      .single();

    console.log("Invitation creation result:", { invitation, invitationError });

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }

    console.log("Invitation record created successfully");

    // For now, return success without sending email (since RESEND_API_KEY might not be configured)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Company Owner invitation created successfully",
        data: { 
          invitationId: invitation.id,
          companyId, 
          email, 
          companyName,
          note: "Email sending is disabled for testing. Enable RESEND_API_KEY to send emails."
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
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error",
        details: error.stack || "No stack trace available"
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