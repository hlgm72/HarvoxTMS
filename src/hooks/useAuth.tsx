import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  role: string;
  company_id: string;
  is_active: boolean;
  id: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[];
  currentRole: UserRole | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    userRoles: [],
    currentRole: null,
    loading: true,
  });

  // Cache for user roles to avoid redundant queries
  const rolesCache = new Map<string, UserRole[]>();

  const fetchUserRoles = async (userId: string) => {
    // Check cache first
    if (rolesCache.has(userId)) {
      return rolesCache.get(userId) || [];
    }

    try {
      console.log('Fetching roles for user:', userId);
      
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('id, role, company_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      console.log('User roles query result:', { data, error });

      if (error) {
        console.error('Error fetching user roles:', error);
        rolesCache.set(userId, []);
        return [];
      }

      // Cache the result
      const roles = data || [];
      rolesCache.set(userId, roles);
      return roles;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      rolesCache.set(userId, []);
      return [];
    }
  };

  const switchRole = (role: UserRole) => {
    setAuthState(prev => ({
      ...prev,
      currentRole: role,
    }));
    
    // Store current role in localStorage for persistence
    localStorage.setItem('currentRole', JSON.stringify(role));
  };

  const getCurrentRoleFromStorage = (roles: UserRole[]): UserRole | null => {
    try {
      const stored = localStorage.getItem('currentRole');
      if (stored) {
        const storedRole = JSON.parse(stored);
        // Verify the stored role is still valid
        const validRole = roles.find(r => 
          r.id === storedRole.id && 
          r.role === storedRole.role && 
          r.company_id === storedRole.company_id
        );
        return validRole || null;
      }
    } catch (error) {
      console.error('Error reading stored role:', error);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return;

      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        const roles = await fetchUserRoles(session.user.id);
        if (isMounted) {
          // Try to get current role from storage first
          const storedRole = getCurrentRoleFromStorage(roles);
          // If no stored role or stored role is invalid, use first available role
          const currentRole = storedRole || (roles.length > 0 ? roles[0] : null);
          
          setAuthState(prev => ({
            ...prev,
            userRoles: roles,
            currentRole,
            loading: false,
          }));

          // Update stored role if we selected a different one
          if (currentRole && (!storedRole || storedRole.id !== currentRole.id)) {
            localStorage.setItem('currentRole', JSON.stringify(currentRole));
          }
        }
      } else {
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            userRoles: [],
            currentRole: null,
            loading: false,
          }));
          // Clear stored role
          localStorage.removeItem('currentRole');
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // No usar async directamente en el callback
        handleSession(session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem('currentRole');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshRoles = async () => {
    if (authState.user) {
      // Clear cache to force fresh data
      rolesCache.delete(authState.user.id);
      const roles = await fetchUserRoles(authState.user.id);
      const currentRole = getCurrentRoleFromStorage(roles) || (roles.length > 0 ? roles[0] : null);
      
      setAuthState(prev => ({
        ...prev,
        userRoles: roles,
        currentRole,
      }));
    }
  };

  return {
    ...authState,
    signOut,
    switchRole,
    refreshRoles,
    // Backwards compatibility
    userRole: authState.currentRole,
    // New properties
    isAuthenticated: !!authState.user,
    isSuperAdmin: authState.currentRole?.role === 'superadmin',
    isCompanyOwner: authState.currentRole?.role === 'company_owner',
    isOperationsManager: authState.currentRole?.role === 'operations_manager',
    isDispatcher: authState.currentRole?.role === 'dispatcher',
    isDriver: authState.currentRole?.role === 'driver',
    isSafetyManager: authState.currentRole?.role === 'safety_manager',
    isGeneralManager: authState.currentRole?.role === 'general_manager',
    isSeniorDispatcher: authState.currentRole?.role === 'senior_dispatcher',
    // Helper functions
    hasRole: (role: string) => authState.userRoles.some(r => r.role === role),
    hasMultipleRoles: authState.userRoles.length > 1,
    availableRoles: authState.userRoles,
  };
};