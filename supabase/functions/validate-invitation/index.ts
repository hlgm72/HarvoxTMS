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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { token }: ValidateInvitationRequest = await req.json();
    
    if (!token) {
      throw new Error("Invitation token is required");
    }

    // Validate invitation token using the database function
    const { data: invitationData, error: tokenError } = await supabase.rpc(
      "validate_invitation_token",
      { token_param: token }
    );

    if (tokenError) {
      throw new Error(`Error validating invitation: ${tokenError.message}`);
    }

    if (!invitationData || invitationData.length === 0) {
      throw new Error("Invalid or expired invitation token");
    }

    const invitation = invitationData[0];
    
    if (!invitation.is_valid) {
      throw new Error("Invitation has expired or has already been used");
    }

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