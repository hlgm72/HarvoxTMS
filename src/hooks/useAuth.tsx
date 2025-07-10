import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  role: string;
  company_id: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    userRole: null,
    loading: true,
  });

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('role, company_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          // Fetch user role with a small delay to avoid potential issues
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setAuthState(prev => ({
              ...prev,
              userRole: role,
              loading: false,
            }));
          }, 100);
        } else {
          setAuthState(prev => ({
            ...prev,
            userRole: null,
            loading: false,
          }));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setAuthState(prev => ({
          ...prev,
          userRole: role,
          loading: false,
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    ...authState,
    signOut,
    isAuthenticated: !!authState.user,
    isSuperAdmin: authState.userRole?.role === 'superadmin',
    isCompanyOwner: authState.userRole?.role === 'company_owner',
    isOperationsManager: authState.userRole?.role === 'operations_manager',
    isDispatcher: authState.userRole?.role === 'dispatcher',
    isDriver: authState.userRole?.role === 'driver',
  };
};