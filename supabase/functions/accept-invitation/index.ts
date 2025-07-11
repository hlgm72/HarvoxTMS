import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  invitationToken: string;
  password: string;
  firstName: string;
  lastName: string;
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

    const { invitationToken, password, firstName, lastName }: AcceptInvitationRequest = await req.json();

    // Validate input
    if (!invitationToken || !password || !firstName || !lastName) {
      throw new Error("Missing required fields: invitationToken, password, firstName, lastName");
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

    // Check if user already exists with this email
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      throw new Error(`Error checking existing users: ${userCheckError.message}`);
    }

    const userExists = existingUser.users.find(user => user.email === invitation.email);
    
    if (userExists) {
      throw new Error("A user with this email address already exists");
    }

    // Create the user using Admin API
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true, // Skip email confirmation since it's an invited user
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        invited_as: invitation.role,
        company_id: invitation.company_id
      }
    });

    if (createUserError || !newUser.user) {
      throw new Error(`Error creating user: ${createUserError?.message || "Unknown error"}`);
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't fail the whole process for profile creation error
    }

    // Assign the company role
    const { error: roleError } = await supabase
      .from("user_company_roles")
      .insert({
        user_id: newUser.user.id,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully",
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
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
    console.error("Error in accept-invitation:", error);
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