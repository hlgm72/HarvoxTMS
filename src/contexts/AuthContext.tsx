import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/authUtils';

interface UserRole {
  role: string;
  company_id: string;
  is_active: boolean;
  id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[] | null;
  currentRole: string | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  loading: boolean;
  
  // Additional properties for compatibility
  userRole: UserRole | null;
  isAuthenticated: boolean;
  availableRoles: UserRole[];
  hasMultipleRoles: boolean;
  isSuperAdmin: boolean;
  isCompanyOwner: boolean;
  isOperationsManager: boolean;
  isDispatcher: boolean;
  isDriver: boolean;
  switchRole: (roleId: string) => void;
  refreshRoles: () => Promise<void>;
  _forceUpdate: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add defensive checks for React hooks
  if (typeof useState !== 'function') {
    console.error('useState is not available. React hooks may not be imported correctly.');
    return <div>Loading...</div>;
  }

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[] | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // Get current active role from roles array
  const userRole = userRoles?.find(role => role.role === currentRole) || null;
  const isAuthenticated = !!user && !!session;
  const availableRoles = userRoles || [];
  const hasMultipleRoles = availableRoles.length > 1;

  // Role checks
  const isSuperAdmin = userRole?.role === 'superadmin';
  const isCompanyOwner = userRole?.role === 'company_owner';
  const isOperationsManager = userRole?.role === 'operations_manager';
  const isDispatcher = userRole?.role === 'dispatcher';
  const isDriver = userRole?.role === 'driver';

  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      // console.log('🔍 Fetching roles for user:', userId);
      const { data: roles, error } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      // console.log('📋 User roles found:', roles);
      return roles || [];
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return [];
    }
  }, []);

  const determineCurrentRole = useCallback((roles: UserRole[]) => {
    if (!roles || roles.length === 0) return null;

    // Check for stored role preference
    const storedRole = localStorage.getItem('currentRole');
    if (storedRole) {
      try {
        const parsedRole = JSON.parse(storedRole);
        const validRole = roles.find(r => r.role === parsedRole.role && r.company_id === parsedRole.company_id);
        if (validRole) {
          // console.log('🎯 Using stored role:', validRole.role);
          return validRole.role;
        }
      } catch (e) {
        console.warn('Error parsing stored role:', e);
      }
    }

    // Role hierarchy for automatic selection
    const roleHierarchy = ['superadmin', 'company_owner', 'operations_manager', 'dispatcher', 'driver'];
    
    for (const roleType of roleHierarchy) {
      const role = roles.find(r => r.role === roleType);
      if (role) {
        // console.log('🎯 Auto-selected role:', role.role);
        return role.role;
      }
    }

    return roles[0]?.role || null;
  }, []);

  const refreshRoles = useCallback(async () => {
    if (!user?.id) return;
    
    const roles = await fetchUserRoles(user.id);
    setUserRoles(roles);
    
    const selectedRole = determineCurrentRole(roles);
    setCurrentRole(selectedRole);
  }, [user?.id, fetchUserRoles, determineCurrentRole]);

  const switchRole = useCallback((roleId: string) => {
    const role = userRoles?.find(r => r.id === roleId);
    if (role) {
      // console.log('🔄 Switching to role:', role.role);
      setCurrentRole(role.role);
      
      // Store role preference
      localStorage.setItem('currentRole', JSON.stringify({
        role: role.role,
        company_id: role.company_id
      }));
      
      // Force update
      setForceUpdateCounter(prev => prev + 1);
    }
  }, [userRoles]);

  const _forceUpdate = useCallback(() => {
    setForceUpdateCounter(prev => prev + 1);
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer role fetching to avoid potential conflicts
        setTimeout(async () => {
          if (!mounted) return;
          
          try {
            console.log('🔍 Fetching roles for user:', session.user.id);
            const { data: roles, error } = await supabase
              .from('user_company_roles')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_active', true);

            console.log('📋 Raw roles data:', { roles, error });

            if (error) {
              console.error('Error fetching user roles:', error);
              setUserRoles([]);
              setCurrentRole(null);
              setLoading(false);
              return;
            }

            const userRoles = roles || [];
            console.log('📋 Setting user roles:', userRoles);
            setUserRoles(userRoles);
            
            // Determine current role
            let selectedRole = null;
            if (userRoles.length > 0) {
              const storedRole = localStorage.getItem('currentRole');
              if (storedRole) {
                try {
                  const parsedRole = JSON.parse(storedRole);
                  const validRole = userRoles.find(r => r.role === parsedRole.role && r.company_id === parsedRole.company_id);
                  if (validRole) {
                    selectedRole = validRole.role;
                  }
                } catch (e) {
                  console.warn('Error parsing stored role:', e);
                }
              }
              
              if (!selectedRole) {
                const roleHierarchy = ['superadmin', 'company_owner', 'operations_manager', 'dispatcher', 'driver'];
                for (const roleType of roleHierarchy) {
                  const role = userRoles.find(r => r.role === roleType);
                  if (role) {
                    selectedRole = role.role;
                    break;
                  }
                }
                
                if (!selectedRole) {
                  selectedRole = userRoles[0]?.role || null;
                }
              }
            }
            
            console.log('🎯 Final selected role:', selectedRole);
            setCurrentRole(selectedRole);
            setLoading(false);
          } catch (error) {
            console.error('Error in role fetching:', error);
            setUserRoles([]);
            setCurrentRole(null);
            setLoading(false);
          }
        }, 100);
      } else {
        setUserRoles(null);
        setCurrentRole(null);
        localStorage.removeItem('currentRole');
        setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Handle initial session roles
        supabase
          .from('user_company_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .then(({ data: roles, error }) => {
            if (!mounted) return;
            
            if (error) {
              console.error('Error fetching user roles:', error);
              setUserRoles([]);
              setCurrentRole(null);
              setLoading(false);
              return;
            }

            const userRoles = roles || [];
            setUserRoles(userRoles);
            
            // Determine current role
            let selectedRole = null;
            if (userRoles.length > 0) {
              const storedRole = localStorage.getItem('currentRole');
              if (storedRole) {
                try {
                  const parsedRole = JSON.parse(storedRole);
                  const validRole = userRoles.find(r => r.role === parsedRole.role && r.company_id === parsedRole.company_id);
                  if (validRole) {
                    selectedRole = validRole.role;
                  }
                } catch (e) {
                  console.warn('Error parsing stored role:', e);
                }
              }
              
              if (!selectedRole) {
                const roleHierarchy = ['superadmin', 'company_owner', 'operations_manager', 'dispatcher', 'driver'];
                for (const roleType of roleHierarchy) {
                  const role = userRoles.find(r => r.role === roleType);
                  if (role) {
                    selectedRole = role.role;
                    break;
                  }
                }
                
                if (!selectedRole) {
                  selectedRole = userRoles[0]?.role || null;
                }
              }
            }
            
            setCurrentRole(selectedRole);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to prevent infinite loops

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clean up all auth state using utility
      cleanupAuthState();
      setUserRoles(null);
      setCurrentRole(null);
      
      // Attempt to sign out from Supabase
      await supabase.auth.signOut();
      
      // No need for window.location.href - let React Router handle it
      // The ProtectedRoute will detect no auth and redirect appropriately
    } catch (error) {
      console.error('Error signing out:', error);
      // Clean up state anyway
      cleanupAuthState();
      setUserRoles(null);
      setCurrentRole(null);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userRoles,
    currentRole,
    signOut,
    signIn,
    signUp,
    loading,
    userRole,
    isAuthenticated,
    availableRoles,
    hasMultipleRoles,
    isSuperAdmin,
    isCompanyOwner,
    isOperationsManager,
    isDispatcher,
    isDriver,
    switchRole,
    refreshRoles,
    _forceUpdate
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};