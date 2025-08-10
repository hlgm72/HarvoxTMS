import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { UserInvite } from "../_shared/email-templates/UserInvite.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UserInvitationRequest {
  companyId: string;
  email: string;
  companyName: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== USER INVITATION HANDLER STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting user invitation process...");
    
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
    const { companyId, email, companyName, role, first_name, last_name } = requestBody as UserInvitationRequest;

    console.log("Request data:", { companyId, email, companyName, role, first_name, last_name });

    // Validate input
    if (!companyId || !email || !companyName || !role) {
      throw new Error("Missing required fields: companyId, email, companyName, role");
    }

    // Verify the user token (but use service role for database operations)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    console.log("User authenticated:", user.id);

    // Check if user is company owner for this company
    // Instead of using the RPC function, we'll query directly since we have the user ID
    const { data: companyOwnerCheck, error: roleError } = await supabase
      .from('user_company_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('role', 'company_owner')
      .eq('is_active', true)
      .single();

    if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error("Error checking company owner role:", roleError);
      throw new Error("Error verifying permissions");
    }

    if (!companyOwnerCheck) {
      throw new Error("Access denied. Company Owner role required for this company.");
    }

    console.log("Company Owner validation passed");

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // First, deactivate any existing pending invitations for this email and company
    console.log("Deactivating existing invitations for:", email, "in company:", companyId);
    
    const { error: deactivateError } = await supabase
      .from('user_invitations')
      .update({ 
        expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString());

    if (deactivateError) {
      console.error("Error deactivating existing invitations:", deactivateError);
      // Don't fail the operation, just log the error
    } else {
      console.log("Existing invitations deactivated successfully");
    }

    // Create new invitation record (using service role, so no RLS restrictions)
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .insert({
        company_id: companyId,
        email: email.toLowerCase(),
        invitation_token: invitationToken,
        role: role,
        first_name: first_name || null,
        last_name: last_name || null,
        invited_by: user.id
      })
      .select('id')
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }

    console.log("Invitation created successfully:", invitation.id);

    // ============================================
    // PRE-REGISTER USER COMPLETELY IN DATABASE
    // ============================================
    let preRegisteredUserId: string | null = null;
    
    try {
      console.log("🔄 Checking if user already exists in auth...");
      
      // First check if a user with this email already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error("Error checking existing users:", listError);
        throw new Error(`Failed to check existing users: ${listError.message}`);
      }
      
      const existingUser = existingUsers.users.find(u => u.email === email);
      
      if (existingUser) {
        console.log("✅ User already exists in auth, using existing user:", existingUser.id);
        preRegisteredUserId = existingUser.id;
        
        // Update user metadata to include invitation info
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              ...existingUser.user_metadata,
              first_name: first_name,
              last_name: last_name,
              is_pre_registered: true,
              invited_by: user.id,
              company_id: companyId,
              invited_as: role
            }
          }
        );
        
        if (updateError) {
          console.error("Error updating existing user metadata:", updateError);
          // Don't fail the process, just log the error
        }
      } else {
        console.log("🔄 Creating new pre-registered auth user...");
        
        // Create a placeholder user in auth.users for the invited user
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: false, // Don't require email confirmation yet
          password: crypto.randomUUID(), // Generate a random password - user will reset this when activating
          user_metadata: {
            first_name: first_name,
            last_name: last_name,
            is_pre_registered: true, // Flag to indicate this is a pre-registered user
            invited_by: user.id,
            company_id: companyId,
            invited_as: role
          }
        });

        if (authError) {
          console.error("Error creating auth user:", authError);
          throw new Error(`Failed to create user account: ${authError.message}`);
        }

        if (!newUser.user) {
          throw new Error("No user returned from auth.admin.createUser");
        }

        preRegisteredUserId = newUser.user.id;
        console.log("✅ New pre-registered auth user created:", preRegisteredUserId);
      }

      // ============================================
      // CREATE ALL NECESSARY RECORDS
      // ============================================
      
      // Check if profiles already exist to avoid duplicate key errors
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", preRegisteredUserId)
        .single();

      const { data: existingRole } = await supabase
        .from("user_company_roles")
        .select("id")
        .eq("user_id", preRegisteredUserId)
        .eq("company_id", companyId)
        .eq("role", role)
        .single();

      const profileInserts = [];

      // Only create profiles that don't exist
      if (!existingProfile) {
        profileInserts.push(
          supabase
            .from("profiles")
            .insert({
              user_id: preRegisteredUserId,
              first_name: first_name,
              last_name: last_name
            })
        );
      }

      // Create driver-specific records if role is driver
      if (role === 'driver') {
        const { data: existingDriverProfile } = await supabase
          .from("driver_profiles")
          .select("user_id")
          .eq("user_id", preRegisteredUserId)
          .single();

        if (!existingDriverProfile) {
          profileInserts.push(
            supabase
              .from("driver_profiles")
              .insert({
                user_id: preRegisteredUserId,
                is_active: true
              })
          );
        }

        // Create owner operator record for drivers
        if (!existingRole) {
          profileInserts.push(
            supabase
              .from("owner_operators")
              .insert({
                user_id: preRegisteredUserId,
                company_id: companyId,
                operator_type: "company_driver",
                contract_start_date: new Date().toISOString().split('T')[0],
                is_active: true
              })
          );
        }
      }

      // Create user company role
      if (!existingRole) {
        profileInserts.push(
          supabase
            .from("user_company_roles")
            .insert({
              user_id: preRegisteredUserId,
              company_id: companyId,
              role: role,
              is_active: true,
              assigned_by: user.id
            })
        );
      }

      // Execute all inserts
      const results = await Promise.allSettled(profileInserts);
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error("Some profile creation operations failed:", failures);
        // Log failures but don't fail the entire process
        failures.forEach((failure, index) => {
          console.error(`Profile creation failure ${index}:`, failure.reason);
        });
      }

      // Update invitation with the created user_id
      const { error: updateError } = await supabase
        .from("user_invitations")
        .update({ 
          target_user_id: preRegisteredUserId,
          metadata: {
            pre_registered: true,
            role: role
          }
        })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Error updating invitation with user_id:", updateError);
      }

      console.log("✅ User pre-registered successfully with full profile");
      
    } catch (profileError: any) {
      console.error("❌ Error during pre-registration:", profileError);
      
      // If we created the auth user but failed later, we should clean up
      if (preRegisteredUserId) {
        try {
          await supabase.auth.admin.deleteUser(preRegisteredUserId);
          console.log("🧹 Cleaned up partially created auth user");
        } catch (cleanupError) {
          console.error("Failed to cleanup auth user:", cleanupError);
        }
      }
      
      // Fail the entire invitation if pre-registration fails
      throw new Error(`Pre-registration failed: ${profileError.message}`);
    }

    // Send invitation email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    // Get the frontend URL from environment or use the referer header
    const refererHeader = req.headers.get("referer") || "";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || 
                       (refererHeader ? new URL(refererHeader).origin : "http://localhost:3000");
    
    const invitationUrl = `${frontendUrl}/invitation/${invitationToken}`;
    
    const displayName = first_name && last_name ? `${first_name} ${last_name}` : email;
    const roleDisplayName = role === 'driver' ? 'Driver' : 
                           role === 'dispatcher' ? 'Dispatcher' : 
                           role === 'senior_dispatcher' ? 'Senior Dispatcher' :
                           role === 'operations_manager' ? 'Operations Manager' :
                           role === 'general_manager' ? 'General Manager' :
                           role === 'safety_manager' ? 'Safety Manager' : role;
    
    try {
      // Render the modern React email template
      const emailHtml = await renderAsync(
        React.createElement(UserInvite, {
          recipientName: first_name || email.split('@')[0],
          companyName: companyName,
          role: roleDisplayName,
          invitationUrl: invitationUrl
        })
      );

      const emailResponse = await resend.emails.send({
        from: "FleetNest TMS <noreply@fleetnest.app>",
        to: [email],
        subject: `Invitación para unirte a ${companyName} - FleetNest`,
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
        message: "User invitation created successfully",
        data: { 
          invitationId: invitation.id,
          companyId, 
          email, 
          companyName,
          role,
          displayName
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
    console.error("Error in send-user-invitation:", error);
    
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