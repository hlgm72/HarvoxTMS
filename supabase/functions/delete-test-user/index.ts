import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
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

    const { confirmEmail }: DeleteUserRequest = await req.json();

    console.log("Attempting to delete user with email:", confirmEmail);

    // Validate input
    if (!confirmEmail) {
      throw new Error("Missing required field: confirmEmail");
    }

    // Verify the email matches the test user
    if (confirmEmail !== "hgig7274@gmail.com") {
      throw new Error("This function can only delete the test user hgig7274@gmail.com");
    }

    // Find the user by email
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Error listing users: ${listError.message}`);
    }

    const targetUser = userList.users.find(user => user.email === confirmEmail);
    
    if (!targetUser) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `User ${confirmEmail} not found - already deleted or never existed`,
          alreadyDeleted: true
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log("User found, proceeding with deletion:", targetUser.email, "ID:", targetUser.id);

    // Delete related records first (they should cascade but let's be explicit)
    const { error: rolesError } = await supabase
      .from("user_company_roles")
      .delete()
      .eq("user_id", targetUser.id);

    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", targetUser.id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
    }

    // Delete the user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id);

    if (deleteError) {
      throw new Error(`Error deleting user: ${deleteError.message}`);
    }

    console.log("User deleted successfully:", confirmEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${confirmEmail} deleted successfully`,
        deletedUserId: targetUser.id
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