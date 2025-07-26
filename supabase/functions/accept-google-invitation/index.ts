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
    
    console.log("Invitation details:", { 
      is_valid: invitation.is_valid, 
      accepted_at: invitation.accepted_at,
      email: invitation.email,
      role: invitation.role 
    });

    // Check if invitation is already accepted but still process it (in case role assignment failed)
    if (!invitation.is_valid && !invitation.accepted_at) {
      throw new Error("Invitation has expired or is invalid");
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
      .eq("role", invitation.role)
      .single();

    if (existingRoleError && existingRoleError.code !== 'PGRST116') { // Not "no rows" error
      console.error("Error checking existing roles:", existingRoleError);
      throw new Error(`Error checking existing roles: ${existingRoleError.message}`);
    }

    let roleProcessed = false;
    if (existingRole) {
      console.log("User already has this role, ensuring it's active:", existingRole);
      // Update existing role to ensure it's active
      const { error: updateRoleError } = await supabase
        .from("user_company_roles")
        .update({ 
          is_active: true, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", existingRole.id);
      
      if (updateRoleError) {
        console.error("Error updating existing role:", updateRoleError);
      } else {
        console.log("Existing role updated successfully");
        roleProcessed = true;
      }
    }

    // Check if user profile exists, create if it doesn't
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') { // Not "no rows" error
      console.error("Error checking existing profile:", profileCheckError);
    }

    // Create or update user profile with invitation data
    if (!existingProfile) {
      console.log("Creating new profile for user:", userId);
      console.log("Invitation data:", { first_name: invitation.first_name, last_name: invitation.last_name });
      
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          first_name: invitation.first_name || 'Unknown',
          last_name: invitation.last_name || 'User',
          timezone: 'America/Chicago' // Central Time Zone for US Central region
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't fail the whole process for profile creation error
      } else {
        console.log("Profile created successfully for user:", userId);
      }
    } else if (!existingProfile.first_name || !existingProfile.last_name) {
      console.log("Updating existing profile with missing data");
      console.log("Existing profile:", existingProfile);
      console.log("Invitation data:", { first_name: invitation.first_name, last_name: invitation.last_name });
      
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          first_name: existingProfile.first_name || invitation.first_name || 'Unknown',
          last_name: existingProfile.last_name || invitation.last_name || 'User',
          timezone: existingProfile.timezone || 'America/Chicago'
        })
        .eq("user_id", userId);

      if (updateProfileError) {
        console.error("Error updating profile:", updateProfileError);
      } else {
        console.log("Profile updated successfully");
      }
    }

    // Assign the company role (only if not already processed)
    if (!roleProcessed) {
      console.log("Creating new role for user");
      const { error: roleError } = await supabase
        .from("user_company_roles")
        .upsert({
          user_id: userId,
          company_id: invitation.company_id,
          role: invitation.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,company_id,role',
          ignoreDuplicates: false 
        });

      if (roleError) {
        console.error("Error assigning company role:", roleError);
        throw new Error(`Error assigning company role: ${roleError.message}`);
      } else {
        console.log("New role created successfully");
        roleProcessed = true;
      }
    }

    // Mark invitation as accepted (only if not already accepted)
    if (!invitation.accepted_at) {
      console.log("Marking invitation as accepted");
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
    } else {
      console.log("Invitation already marked as accepted");
    }

    if (!roleProcessed) {
      throw new Error("Failed to process user role assignment");
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