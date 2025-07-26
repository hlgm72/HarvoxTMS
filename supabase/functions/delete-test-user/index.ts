import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
  confirmEmail: string;
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

    const { userId, confirmEmail }: DeleteUserRequest = await req.json();

    console.log("Attempting to delete user:", { userId, confirmEmail });

    // Validate input
    if (!userId || !confirmEmail) {
      throw new Error("Missing required fields: userId, confirmEmail");
    }

    // Verify the email matches the user we want to delete
    if (confirmEmail !== "hgig7274@gmail.com") {
      throw new Error("This function can only delete the test user hgig7274@gmail.com");
    }

    // Verify the user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      throw new Error(`Error finding user: ${userError.message}`);
    }

    if (!userData.user || userData.user.email !== confirmEmail) {
      throw new Error("User not found or email mismatch");
    }

    console.log("User found, proceeding with deletion:", userData.user.email);

    // Delete related records first (they should cascade but let's be explicit)
    const { error: rolesError } = await supabase
      .from("user_company_roles")
      .delete()
      .eq("user_id", userId);

    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
    }

    // Delete the user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(`Error deleting user: ${deleteError.message}`);
    }

    console.log("User deleted successfully:", confirmEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${confirmEmail} deleted successfully`,
        deletedUserId: userId
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
    console.error("Error in delete-test-user:", error);
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