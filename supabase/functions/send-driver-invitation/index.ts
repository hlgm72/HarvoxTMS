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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user from the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid authorization token");
    }

    console.log("Authenticated user:", user.id);

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
      .eq("user_id", user.id)
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

    // Check if user with this email already exists
    const { data: existingInvitation } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", email)
      .eq("company_id", companyId)
      .eq("role", "driver")
      .is("accepted_at", null);

    if (existingInvitation && existingInvitation.length > 0) {
      console.log("Existing invitation found for email:", email);
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
          invited_by: user.id,
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
      from: "FleetNest <no-reply@fleetnest.app>",
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
        from: "FleetNest <no-reply@fleetnest.app>",
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