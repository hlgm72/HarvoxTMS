import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { DriverInvite } from "../_shared/email-templates/DriverInvite.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DriverInvitationRequest {
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string; // ISO date string
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Create Supabase clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user from the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }
    const token = authHeader.replace("Bearer ", "");

    // Validate user token using anon client with forwarded Authorization header
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let userId: string | null = null;
    let userEmail: string | null = null;

    try {
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (user && !userError) {
        userId = user.id;
        userEmail = user.email ?? null;
      } else if (userError) {
        console.error("Auth validation error:", userError);
      }
    } catch (e) {
      console.error("auth.getUser threw:", e);
    }

    if (!userId) {
      // Fallback: decode JWT (verify_jwt already validated signature at the gateway)
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        userId = payload.sub || payload.user_id || null;
        userEmail = payload.email || null;
      } catch (e) {
        console.error("Failed to decode JWT:", e);
      }
    }

    if (!userId) {
      throw new Error("Invalid authorization token");
    }

    console.log("Authenticated user:", userId, userEmail);

    

    // Parse request body
    const { firstName, lastName, email, hireDate }: DriverInvitationRequest = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !hireDate) {
      throw new Error("Missing required fields: firstName, lastName, email, hireDate");
    }

    console.log("Driver invitation request:", { firstName, lastName, email, hireDate });

    // Get user's company roles to verify they can invite drivers
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_company_roles")
      .select("company_id, role")
      .eq("user_id", userId!)
      .eq("is_active", true);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw new Error("Failed to verify user permissions");
    }

    if (!userRoles || userRoles.length === 0) {
      throw new Error("User has no active company roles");
    }

    // Check if user has permission to invite drivers (owner, general_manager, operations_manager)
    const canInvite = userRoles.some(role => 
      ['company_owner', 'general_manager', 'operations_manager'].includes(role.role)
    );

    if (!canInvite) {
      throw new Error("User does not have permission to invite drivers");
    }

    // Use the first company (could be enhanced to specify which company)
    const companyId = userRoles[0].company_id;

    // Check if user with this email already has a valid (non-expired) invitation
    const { data: existingInvitation } = await supabase
      .from("user_invitations")
      .select("id, target_user_id, expires_at")
      .eq("email", email)
      .eq("company_id", companyId)
      .eq("role", "driver")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()) // Only check for non-expired invitations
      .single();

    if (existingInvitation) {
      // If invitation exists but target_user_id is null, it means pre-registration failed
      // In this case, we should try to complete the pre-registration process
      if (!existingInvitation.target_user_id) {
        console.log("Found incomplete invitation, attempting to complete pre-registration...");
        // Delete the incomplete invitation so we can create a new complete one
        const { error: deleteError } = await supabase
          .from("user_invitations")
          .delete()
          .eq("id", existingInvitation.id);
        
        if (deleteError) {
          console.error("Error deleting incomplete invitation:", deleteError);
          // Continue anyway - the new invitation creation might still work
        }
      } else {
        // Invitation exists and is complete - return error
        console.log("Existing complete invitation found for email:", email);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Ya existe una invitación pendiente para este email"
          }),
          {
            status: 200, // Always return 200 to make error handling consistent
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders 
            },
          }
        );
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .insert([
        {
          email,
          company_id: companyId,
          role: "driver",
          invitation_token: invitationToken,
          invited_by: userId!,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          first_name: firstName,
          last_name: lastName,
        },
      ])
      .select()
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }

    console.log("Invitation created successfully:", invitation.id);

    // Create user profile immediately for pre-registration functionality
    // This allows managing the driver (loads, payments, etc.) before they activate their account
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
              first_name: firstName,
              last_name: lastName,
              is_pre_registered: true,
              invited_by: userId,
              company_id: companyId,
              hire_date: hireDate
            }
          }
        );
        
        if (updateError) {
          console.error("Error updating existing user metadata:", updateError);
          // Don't fail the process, just log the error
        }
      } else {
        console.log("🔄 Creating new pre-registered auth user...");
        
        // Create a placeholder user in auth.users for the driver
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: false, // Don't require email confirmation yet
          password: crypto.randomUUID(), // Generate a random password - user will reset this when activating
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            is_pre_registered: true, // Flag to indicate this is a pre-registered user
            invited_by: userId,
            company_id: companyId,
            hire_date: hireDate
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

      // Create all necessary records in a transaction-like manner
      // Check if profiles already exist to avoid duplicate key errors
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", preRegisteredUserId)
        .single();

      const { data: existingDriverProfile } = await supabase
        .from("driver_profiles")
        .select("user_id")
        .eq("user_id", preRegisteredUserId)
        .single();

      const { data: existingRole } = await supabase
        .from("user_company_roles")
        .select("id")
        .eq("user_id", preRegisteredUserId)
        .eq("company_id", companyId)
        .eq("role", "driver")
        .single();

      const profileInserts = [];

      // Only create profiles that don't exist
      if (!existingProfile) {
        profileInserts.push(
          supabase
            .from("profiles")
            .insert({
              user_id: preRegisteredUserId,
              first_name: firstName,
              last_name: lastName,
              hire_date: hireDate
            })
        );
      }

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

      if (!existingRole) {
        profileInserts.push(
          supabase
            .from("user_company_roles")
            .insert({
              user_id: preRegisteredUserId,
              company_id: companyId,
              role: "driver",
              is_active: true,
              assigned_by: userId
            })
        );

        // Also create owner operator record for new drivers
        profileInserts.push(
          supabase
            .from("owner_operators")
            .insert({
              user_id: preRegisteredUserId,
              company_id: companyId,
              operator_type: "company_driver",
              contract_start_date: hireDate,
              is_active: true
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
            hire_date: hireDate,
            pre_registered: true
          }
        })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Error updating invitation with user_id:", updateError);
      }

      console.log("✅ Driver pre-registered successfully with full profile");
      
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
    const resend = new Resend(resendApiKey);
    
    // Get the frontend URL from environment or use the referer header
    const refererHeader = req.headers.get("referer") || "";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || 
                       (refererHeader ? new URL(refererHeader).origin : "http://localhost:3000");
    
    const invitationUrl = `${frontendUrl}/invitation/${invitationToken}`;
    
    // Get company information for the email
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const companyName = company?.name || "la empresa";

    console.log('📧 Attempting to send email with Resend...');
    console.log('Email configuration:', {
      to: email,
      from: "FleetNest TMS <no-reply@fleetnest.app>",
      subject: `Invitación para unirte como conductor en ${companyName}`,
      invitationUrl: invitationUrl,
      resendKeyConfigured: !!resendApiKey,
      resendKeyLength: resendApiKey?.length || 0
    });

    let emailResponse;
    try {
      // Render the modern React email template
      const emailHtml = await renderAsync(
        React.createElement(DriverInvite, {
          recipientName: firstName,
          companyName: companyName,
          invitationUrl: invitationUrl,
          hireDate: new Date(hireDate).toLocaleDateString('es-ES')
        })
      );

      emailResponse = await resend.emails.send({
        from: "FleetNest TMS <no-reply@fleetnest.app>",
        to: [email],
        subject: `¡Bienvenido al equipo de ${companyName}!`,
        html: emailHtml,
      });

      console.log("✅ Resend API call completed");
      console.log("Full Resend response:", JSON.stringify(emailResponse, null, 2));
      
      if (emailResponse.error) {
        console.error("❌ Resend returned an error:", emailResponse.error);
        throw new Error(`Error de Resend: ${JSON.stringify(emailResponse.error)}`);
      }

      if (!emailResponse.data?.id) {
        console.error("❌ No email ID returned from Resend");
        console.error("Response structure:", Object.keys(emailResponse));
        throw new Error("Error: No se pudo obtener confirmación del envío del email");
      }

      console.log(`📧 Email sent successfully with ID: ${emailResponse.data.id}`);
      
    } catch (emailError: any) {
      console.error("❌ Failed to send email:", emailError);
      console.error("Email error details:", {
        name: emailError.name,
        message: emailError.message,
        cause: emailError.cause,
        stack: emailError.stack?.split('\n').slice(0, 3)
      });
      
      // Check if it's a specific Resend error
      if (emailError.message?.includes('forbidden') || emailError.message?.includes('401')) {
        throw new Error("Error: API key de Resend inválida o sin permisos");
      } else if (emailError.message?.includes('domain')) {
        throw new Error("Error: Dominio no verificado en Resend");
      } else {
        throw new Error(`Error al enviar email: ${emailError.message}`);
      }
    }

    // Store hire date in invitation metadata (we'll use this when the user accepts)
    await supabase
      .from("user_invitations")
      .update({ 
        // We can store additional data in a jsonb field if needed, or create a separate table
        // For now, we'll handle the hire date when the invitation is accepted
      })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Driver invitation sent successfully",
        invitationId: invitation.id,
        invitationUrl,
        hireDate
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
    console.error("Error in send-driver-invitation:", error);
    console.error("Error stack:", error.stack);
    
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