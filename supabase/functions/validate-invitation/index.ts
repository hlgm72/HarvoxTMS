
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

    // Query the user_invitations table directly instead of using RPC
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

    // Check if invitation is still valid (not expired and not used)
    const now = new Date();
    const expiresAt = new Date(invitationData.expires_at);
    
    if (now > expiresAt || invitationData.accepted_at) {
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
