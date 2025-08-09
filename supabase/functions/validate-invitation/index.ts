
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ValidateInvitationRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token }: ValidateInvitationRequest = await req.json();
    
    console.log("Validating invitation token:", token);
    
    if (!token) {
      console.error("No invitation token provided");
      return new Response(
        JSON.stringify({ success: false, error: "Invitation token is required" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Use the existing database function that has proper security
    console.log("Calling validate_invitation_token function for token:", token);
    
    const { data: invitationData, error: queryError } = await supabase
      .rpc('validate_invitation_token', { token_param: token });

    console.log("validate_invitation_token result:", { invitationData, queryError });

    if (queryError) {
      console.error("Database function error:", queryError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired invitation token" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    if (!invitationData || invitationData.length === 0) {
      console.log("No invitation found for token");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired invitation token" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const invitation = invitationData[0];
    console.log("Found invitation:", invitation);

    if (!invitation.is_valid) {
      console.log("Invitation is not valid:", {
        expires_at: invitation.expires_at,
        current_time: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ success: false, error: "Invitation has expired or has already been used" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log("Invitation validation successful for:", invitation.email);

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          email: invitation.email,
          role: invitation.role,
          companyName: invitation.company_name,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          expiresAt: invitation.expires_at,
          isValid: invitation.is_valid
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
    console.error("Error in validate-invitation:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error" 
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
