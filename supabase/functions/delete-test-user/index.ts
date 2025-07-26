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
  console.log("🚀 Edge function started - method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight handled");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔧 Initializing Supabase client...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("🔧 Environment check:", { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseServiceKey?.substring(0, 10) + "..." 
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Supabase client initialized");

    console.log("📥 Reading request body...");
    const requestBody = await req.json();
    console.log("📥 Request body received:", requestBody);
    
    const { confirmEmail }: DeleteUserRequest = requestBody;

    // Validate input
    if (!confirmEmail) {
      console.log("❌ Missing confirmEmail");
      throw new Error("Missing required field: confirmEmail");
    }

    // Verify the email matches the test user
    if (confirmEmail !== "hgig7274@gmail.com") {
      console.log("❌ Wrong email:", confirmEmail);
      throw new Error("This function can only delete the test user hgig7274@gmail.com");
    }

    console.log("🔍 Looking for user with email:", confirmEmail);

    // Find the user by email using listUsers
    console.log("📋 Listing all users...");
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log("❌ Error listing users:", listError);
      throw new Error(`Error listing users: ${listError.message}`);
    }

    console.log("📋 Found users count:", userList?.users?.length || 0);
    
    const targetUser = userList.users.find(user => user.email === confirmEmail);
    
    if (!targetUser) {
      console.log("✅ User not found - returning success (already deleted)");
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

    console.log("🎯 Target user found:", { id: targetUser.id, email: targetUser.email });

    // Delete related records first
    console.log("🗑️ Deleting user roles...");
    const { error: rolesError } = await supabase
      .from("user_company_roles")
      .delete()
      .eq("user_id", targetUser.id);

    if (rolesError) {
      console.log("⚠️ Error deleting user roles:", rolesError);
    } else {
      console.log("✅ User roles deleted");
    }

    console.log("🗑️ Deleting profile...");
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", targetUser.id);

    if (profileError) {
      console.log("⚠️ Error deleting profile:", profileError);
    } else {
      console.log("✅ Profile deleted");
    }

    // Delete the user from auth
    console.log("🗑️ Deleting user from auth...");
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id);

    if (deleteError) {
      console.log("❌ Error deleting user from auth:", deleteError);
      throw new Error(`Error deleting user: ${deleteError.message}`);
    }

    console.log("✅ User deleted successfully:", confirmEmail);

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
    console.error("❌ Error in delete-test-user:", error);
    console.error("❌ Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error",
        stack: error.stack
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