
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

    // Query the user_invitations table directly with service role
    console.log("Querying user_invitations table for token:", token);
    
    const { data: invitationData, error: queryError } = await supabase
      .from('user_invitations')
      .select(`
        *,
        companies!inner(name)
      `)
      .eq('invitation_token', token)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log("Query result:", { invitationData, queryError });
    console.log("Current time:", new Date().toISOString());

    if (queryError) {
      console.error("Database query error:", queryError);
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

    if (!invitationData) {
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

    console.log("Found invitation:", invitationData);

    console.log("Invitation validation successful for:", invitationData.email);

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          email: invitationData.email,
          role: invitationData.role,
          companyName: invitationData.companies.name,
          firstName: invitationData.first_name,
          lastName: invitationData.last_name,
          expiresAt: invitationData.expires_at,
          isValid: true
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
