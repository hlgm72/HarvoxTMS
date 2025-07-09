import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const { email, password, firstName = 'Super', lastName = 'Admin' } = await req.json()

    // Validate required fields
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Starting Superadmin setup process for email:', email)

    // Check if system needs initial setup
    const { data: setupNeeded, error: setupCheckError } = await supabase
      .rpc('needs_initial_setup')

    if (setupCheckError) {
      console.error('Error checking setup status:', setupCheckError)
      throw new Error('Failed to check system setup status')
    }

    if (!setupNeeded) {
      console.log('Setup not needed - Superadmin already exists')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'System already has a Superadmin. Only one Superadmin can exist.',
          setupComplete: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('System needs initial setup - proceeding with Superadmin creation')

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'superadmin'
      },
      email_confirm: true // Auto-confirm email for initial setup
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw new Error(`Failed to create user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned')
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Wait a moment for the profile trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Assign Superadmin role using our database function
    const { data: roleAssignment, error: roleError } = await supabase
      .rpc('assign_first_superadmin', {
        target_user_id: authData.user.id
      })

    if (roleError) {
      console.error('Error assigning Superadmin role:', roleError)
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to assign Superadmin role: ${roleError.message}`)
    }

    if (!roleAssignment?.success) {
      console.error('Role assignment failed:', roleAssignment)
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(roleAssignment?.message || 'Failed to assign Superadmin role')
    }

    console.log('Superadmin setup completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Superadmin created successfully',
        user_id: authData.user.id,
        email: authData.user.email,
        setupComplete: true,
        details: roleAssignment
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Superadmin setup error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        setupComplete: false
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})