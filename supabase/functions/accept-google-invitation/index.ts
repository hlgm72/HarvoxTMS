import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AcceptGoogleInvitationRequest {
  invitationToken: string;
  userEmail: string;
  userId: string;
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

    const { invitationToken, userEmail, userId }: AcceptGoogleInvitationRequest = await req.json();

    console.log("Processing Google invitation acceptance:", { invitationToken, userEmail, userId });

    // Validate input
    if (!invitationToken || !userEmail || !userId) {
      throw new Error("Missing required fields: invitationToken, userEmail, userId");
    }

    // Validate invitation token
    const { data: invitationData, error: tokenError } = await supabase.rpc(
      "validate_invitation_token",
      { token_param: invitationToken }
    );

    if (tokenError) {
      throw new Error(`Error validating invitation: ${tokenError.message}`);
    }

    if (!invitationData || invitationData.length === 0) {
      throw new Error("Invalid invitation token");
    }

    const invitation = invitationData[0];
    
    if (!invitation.is_valid) {
      throw new Error("Invitation has expired or has already been used");
    }

    // Verify that the Google user email matches the invitation email
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error(`This invitation is for ${invitation.email}, but you signed in with ${userEmail}`);
    }

    // Check if user already has a role in this company
    const { data: existingRole, error: existingRoleError } = await supabase
      .from("user_company_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", invitation.company_id)
      .eq("is_active", true)
      .single();

    if (existingRoleError && existingRoleError.code !== 'PGRST116') { // Not "no rows" error
      throw new Error(`Error checking existing roles: ${existingRoleError.message}`);
    }

    if (existingRole) {
      throw new Error("You already have a role in this company");
    }

    // Assign the company role
    const { error: roleError } = await supabase
      .from("user_company_roles")
      .insert({
        user_id: userId,
        company_id: invitation.company_id,
        role: invitation.role,
        is_active: true
      });

    if (roleError) {
      throw new Error(`Error assigning company role: ${roleError.message}`);
    }

    // Mark invitation as accepted
    const { error: updateInvitationError } = await supabase
      .from("user_invitations")
      .update({ 
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", invitation.invitation_id);

    if (updateInvitationError) {
      console.error("Error updating invitation:", updateInvitationError);
      // Don't fail for this error
    }

    // Get company information for response
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", invitation.company_id)
      .single();

    console.log("Google invitation accepted successfully for user:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google invitation accepted successfully",
        user: {
          id: userId,
          email: userEmail,
          role: invitation.role,
          company: company?.name || "Unknown Company"
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
    console.error("Error in accept-google-invitation:", error);
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