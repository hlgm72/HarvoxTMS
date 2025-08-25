/**
 * Authentication debugging utilities
 */

import { supabase } from '@/integrations/supabase/client';

export const debugAuth = async () => {
  console.log('🔍 === AUTHENTICATION DEBUG REPORT ===');
  
  // 1. Check current session
  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('📊 Current session:', session?.session ? 'EXISTS' : 'NONE');
    if (sessionError) console.error('❌ Session error:', sessionError);
  } catch (error) {
    console.error('❌ Error checking session:', error);
  }
  
  // 2. Check current user
  try {
    const { data: user, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.user ? `ID: ${user.user.id}` : 'NONE');
    if (userError) console.error('❌ User error:', userError);
  } catch (error) {
    console.error('❌ Error checking user:', error);
  }
  
  // 3. Check localStorage auth keys
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('auth') || key.includes('supabase') || key.includes('sb-')
  );
  console.log('🗄️ LocalStorage auth keys:', authKeys);
  
  // 4. Check for multiple Supabase projects
  const supabaseKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('supabase.auth.')
  );
  console.log('🔑 Supabase auth keys:', supabaseKeys);
  
  if (supabaseKeys.length > 1) {
    console.warn('⚠️ MULTIPLE SUPABASE PROJECTS DETECTED - This may cause conflicts!');
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`   ${key}:`, value ? 'HAS_VALUE' : 'EMPTY');
    });
  }
  
  // 5. Check Supabase configuration
  console.log('⚙️ Supabase config:');
  console.log('   URL:', 'https://htaotttcnjxqzpsrqwll.supabase.co');
  console.log('   Key starts with:', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  
  // 6. Test connectivity
  try {
    const { data, error } = await supabase.from('driver_profiles').select('count').limit(1);
    console.log('🌐 Database connectivity:', error ? 'FAILED' : 'SUCCESS');
    if (error) console.error('❌ DB error:', error);
  } catch (error) {
    console.error('❌ Connectivity test failed:', error);
  }
  
  console.log('🔍 === END DEBUG REPORT ===');
  
  return {
    authKeys,
    supabaseKeys,
    hasConflicts: supabaseKeys.length > 1
  };
};

export const checkUserExists = async (email: string) => {
  try {
    console.log(`🔍 Checking if user exists: ${email}`);
    
    // Try to get user data from driver_profiles table
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('user_id')
      .limit(1);
    
    if (error) {
      console.error('❌ Error checking users:', error);
      return { exists: false, error: error.message };
    }
    
    console.log(`📊 Found ${data?.length || 0} users in database`);
    
    return { exists: data && data.length > 0, userCount: data?.length || 0 };
  } catch (error) {
    console.error('❌ Error in checkUserExists:', error);
    return { exists: false, error: (error as Error).message };
  }
};

export const createTestUser = async () => {
  console.log('🧪 Creating test user...');
  
  const testEmail = 'test@fleetnest.com';
  const testPassword = 'TestPass123!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          company_name: 'Test Company'
        }
      }
    });
    
    if (error) {
      console.error('❌ Error creating test user:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Test user created successfully');
    console.log('📧 Email:', testEmail);
    console.log('🔐 Password:', testPassword);
    
    return { 
      success: true, 
      email: testEmail, 
      password: testPassword,
      user: data.user 
    };
  } catch (error) {
    console.error('❌ Error in createTestUser:', error);
    return { success: false, error: (error as Error).message };
  }
};