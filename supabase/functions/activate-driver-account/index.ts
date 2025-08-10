import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DriverActivationRequest {
  invitationToken: string;
  password?: string;
  useGoogleAuth?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { invitationToken, password, useGoogleAuth }: DriverActivationRequest = await req.json();

    if (!invitationToken) {
      throw new Error("Invitation token is required");
    }

    console.log("Driver activation request:", { invitationToken, hasPassword: !!password, useGoogleAuth });

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select(`
        id,
        email,
        first_name,
        last_name,
        target_user_id,
        company_id,
        expires_at,
        accepted_at,
        is_active,
        metadata
      `)
      .eq("invitation_token", invitationToken)
      .single();

    if (invitationError || !invitation) {
      console.error("Invitation not found:", invitationError);
      throw new Error("Invalid invitation token");
    }

    // Check if invitation is still valid
    if (invitation.accepted_at) {
      throw new Error("This invitation has already been accepted");
    }

    if (!invitation.is_active) {
      throw new Error("This invitation is no longer active");
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("This invitation has expired");
    }

    if (!invitation.target_user_id) {
      throw new Error("This invitation does not have an associated user account. Please contact support.");
    }

    console.log("Valid invitation found for user:", invitation.target_user_id);

    // If password is provided, update the user's password and enable email confirmation
    if (password && !useGoogleAuth) {
      console.log("🔑 Setting password for pre-registered user...");
      
      const { data: updateResult, error: updateError } = await supabase.auth.admin.updateUserById(
        invitation.target_user_id,
        {
          password: password,
          email_confirm: true, // Enable the account
          user_metadata: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            is_pre_registered: false, // No longer pre-registered
            account_activated: true,
            activation_date: new Date().toISOString()
          }
        }
      );

      if (updateError) {
        console.error("Error updating user password:", updateError);
        throw new Error(`Failed to activate account: ${updateError.message}`);
      }

      console.log("✅ Password set successfully for user");
    } else if (useGoogleAuth) {
      console.log("🔗 Preparing account for Google Auth activation...");
      
      // Mark as ready for Google Auth but don't set password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        invitation.target_user_id,
        {
          email_confirm: true, // Enable the account
          user_metadata: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            is_pre_registered: false,
            account_activated: true,
            activation_date: new Date().toISOString(),
            expects_google_auth: true
          }
        }
      );

      if (updateError) {
        console.error("Error preparing account for Google Auth:", updateError);
        throw new Error(`Failed to prepare account: ${updateError.message}`);
      }

      console.log("✅ Account prepared for Google Auth");
    } else {
      throw new Error("Either password or Google Auth selection is required");
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from("user_invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: invitation.target_user_id,
        status: 'accepted'
      })
      .eq("id", invitation.id);

    if (acceptError) {
      console.error("Error marking invitation as accepted:", acceptError);
      // Don't fail the activation for this
    }

    console.log("✅ Driver account activated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account activated successfully",
        userId: invitation.target_user_id,
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        companyId: invitation.company_id,
        useGoogleAuth: !!useGoogleAuth
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
    console.error("Error in activate-driver-account:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error"
      }),
      {
        status: 200, // Always return 200 for consistent error handling
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);