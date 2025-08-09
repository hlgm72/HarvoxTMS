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
  userTimezone?: string;
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

    const { invitationToken, userEmail, userId, userTimezone }: AcceptGoogleInvitationRequest = await req.json();

    console.log("Processing Google invitation acceptance:", { 
      invitationToken, 
      userEmail, 
      userId, 
      userTimezone: userTimezone || 'not provided' 
    });

    // Validate input
    if (!invitationToken || !userEmail || !userId) {
      throw new Error("Missing required fields: invitationToken, userEmail, userId");
    }

    // Log the timezone being processed
    const finalTimezone = userTimezone || 'America/Chicago';
    console.log('Timezone processing:', {
      received: userTimezone,
      final: finalTimezone,
      wasProvided: !!userTimezone
    });

    // Validate invitation token using direct table access
    console.log("Querying user_invitations table for token:", invitationToken);
    
    const { data: invitationData, error: tokenError } = await supabase
      .from('user_invitations')
      .select(`
        *,
        companies!inner(name)
      `)
      .eq('invitation_token', invitationToken)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log("Query result:", { invitationData, tokenError });
    console.log("Current time:", new Date().toISOString());

    if (tokenError) {
      console.error("Database query error:", tokenError);
      throw new Error(`Error validating invitation: ${tokenError.message}`);
    }

    if (!invitationData) {
      console.log("No invitation found for token");
      throw new Error("Invalid or expired invitation token");
    }

    const invitation = {
      ...invitationData,
      company_name: invitationData.companies.name,
      invitation_id: invitationData.id,
      is_valid: true
    };
    
    console.log("Invitation details:", { 
      is_valid: invitation.is_valid, 
      accepted_at: invitation.accepted_at,
      email: invitation.email,
      role: invitation.role 
    });

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

    // Clean names data (trim whitespace)
    const cleanFirstName = invitation.first_name?.trim() || 'Unknown';
    const cleanLastName = invitation.last_name?.trim() || 'User';
    
    console.log("Processing names:", {
      original_first: invitation.first_name,
      original_last: invitation.last_name,
      cleaned_first: cleanFirstName,
      cleaned_last: cleanLastName
    });

    // Create or update user profile with invitation data
    if (!existingProfile) {
      console.log("Creating new profile for user:", userId);
      console.log("Profile data to insert:", { 
        first_name: cleanFirstName, 
        last_name: cleanLastName,
        timezone: finalTimezone
      });
      
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          timezone: finalTimezone
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't fail the whole process for profile creation error
      } else {
        console.log("Profile created successfully for user:", userId);
      }
    } else {
      // Always update profile with timezone and clean names if missing
      console.log("Profile exists, checking for updates needed");
      console.log("Existing profile before update:", existingProfile);
      
      const updateData: any = {};
      
      // Update first name if missing or different
      if (!existingProfile.first_name || existingProfile.first_name.trim() !== cleanFirstName) {
        updateData.first_name = cleanFirstName;
      }
      
      // Update last name if missing or different
      if (!existingProfile.last_name || existingProfile.last_name.trim() !== cleanLastName) {
        updateData.last_name = cleanLastName;
      }
      
      // Always force timezone update to ensure it's correct
      updateData.timezone = finalTimezone;
      updateData.updated_at = new Date().toISOString();
      
      console.log("Profile update data:", updateData);
      
      if (Object.keys(updateData).length > 2) { // More than just timezone and updated_at
        const { error: updateProfileError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("user_id", userId);

        if (updateProfileError) {
          console.error("Error updating profile:", updateProfileError);
        } else {
          console.log("Profile updated successfully with data:", updateData);
        }
      } else {
        console.log("No profile updates needed besides timezone");
        // Just update timezone
        const { error: timezoneUpdateError } = await supabase
          .from("profiles")
          .update({ timezone: finalTimezone, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
          
        if (timezoneUpdateError) {
          console.error("Error updating timezone:", timezoneUpdateError);
        } else {
          console.log("Timezone updated successfully to:", finalTimezone);
        }
      }
    }

    // Assign the company role (only if not already processed)
    if (!roleProcessed) {
      console.log("Creating new role for user");
      const { error: roleError } = await supabase
        .from("user_company_roles")
        .insert({
          user_id: userId,
          company_id: invitation.company_id,
          role: invitation.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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