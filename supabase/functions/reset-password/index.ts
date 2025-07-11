import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, newPassword }: ResetPasswordRequest = await req.json();

    console.log('Processing password reset for token:', token);

    // Initialize Supabase client with service role (admin access)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate and use the token
    const { data: tokenResult, error: tokenError } = await supabase.rpc('use_reset_token', {
      token_param: token
    });

    if (tokenError) {
      console.error('Error validating token:', tokenError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error validating token' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse the JSON result
    const result = tokenResult as { success: boolean; user_email?: string; message?: string };
    
    if (!result?.success) {
      console.log('Token validation failed:', result?.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: result?.message || 'Invalid or expired token' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userEmail = result.user_email;
    if (!userEmail) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User email not found in token' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error finding user' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = users.users.find(u => u.email === userEmail);
    if (!user) {
      console.log('User not found:', userEmail);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found' 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error updating password' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Password updated successfully for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Password updated successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);