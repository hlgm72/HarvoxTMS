import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/authUtils';
import { logger } from '@/lib/logger';

// Enhanced auth state cleanup utility
const enhancedCleanupAuthState = () => {
  // Use the existing utility
  cleanupAuthState();
  
  // Additional cleanup for specific auth keys
  const authKeys = [
    'supabase.auth.token',
    'sb-auth-token',
    'currentRole'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  });
};

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
  refreshRoles: () => Promise<UserRole[] | undefined>;
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
    logger.error('React hooks not available', new Error('useState is not a function'));
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

  // Debug logging for role checks removed for cleaner console

  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const { data: roles, error } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching user roles', error, { 
          errorCode: error.code,
          component: 'AuthContext'
        });
        
        // If this is an auth/RLS error, try to sign out gracefully
        if (error.message?.includes('refresh token') || 
            error.message?.includes('JWT') || 
            error.message?.includes('Invalid') ||
            error.code === 'PGRST116' ||
            error.code === '42501') {
          logger.warn('Auth/RLS error detected, signing out');
          enhancedCleanupAuthState();
          window.location.href = '/auth';
          return [];
        }
        
        return [];
      }

      return roles || [];
    } catch (error) {
      logger.error('Exception in fetchUserRoles', error as Error, { component: 'AuthContext' });
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
          return validRole.role;
        }
      } catch (e) {
        logger.warn('Error parsing stored role', { error: e });
      }
    }

    // Role hierarchy for automatic selection
    const roleHierarchy = ['superadmin', 'company_owner', 'operations_manager', 'dispatcher', 'driver'];
    
    for (const roleType of roleHierarchy) {
      const role = roles.find(r => r.role === roleType);
      if (role) {
        return role.role;
      }
    }

    return roles[0]?.role || null;
  }, []);

  const refreshRoles = useCallback(async () => {
    // Get current session directly from Supabase instead of relying on state
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logger.error('Error getting session for role refresh', sessionError);
      return;
    }
    
    if (!session?.user) {
      return;
    }
    
    // Add a delay to ensure database consistency after invitation acceptance
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const roles = await fetchUserRoles(session.user.id);
    
    setUserRoles(roles);
    
    const selectedRole = determineCurrentRole(roles);
    setCurrentRole(selectedRole);
    
    // Force update to ensure state changes are propagated
    _forceUpdate();
    
    return roles;
  }, [fetchUserRoles, determineCurrentRole]);

  const switchRole = useCallback((roleId: string) => {
    const role = userRoles?.find(r => r.id === roleId);
    if (role) {
      setCurrentRole(role.role);
      
      // Store role preference
      localStorage.setItem('currentRole', JSON.stringify({
        role: role.role,
        company_id: role.company_id
      }));
      
      // Force update
      setForceUpdateCounter(prev => prev + 1);
    } else {
      logger.warn('Role not found for roleId', { component: 'AuthContext' });
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
      
      // Handle auth errors by cleaning up state
      if (event === 'TOKEN_REFRESHED' && !session) {
        logger.warn('Token refresh failed, cleaning up auth state');
        enhancedCleanupAuthState();
        setSession(null);
        setUser(null);
        setUserRoles(null);
        setCurrentRole(null);
        setLoading(false);
        return;
      }
      
      // Handle signed out state
      if (event === 'SIGNED_OUT') {
        enhancedCleanupAuthState();
        setSession(null);
        setUser(null);
        setUserRoles(null);
        setCurrentRole(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer role fetching to avoid potential conflicts
        setTimeout(async () => {
          if (!mounted) return;
          
          try {
            const { data: roles, error } = await supabase
              .from('user_company_roles')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_active', true);

            if (error) {
              logger.error('Error fetching user roles', error, { component: 'AuthContext' });
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
                  logger.warn('Error parsing stored role', { error: e });
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
          } catch (error) {
            logger.error('Error in role fetching', error as Error, { component: 'AuthContext' });
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

    // Get initial session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        logger.error('Error getting initial session', error, { component: 'AuthContext' });
        // If session retrieval fails due to auth issues, clean up
        if (error.message?.includes('refresh token') || 
            error.message?.includes('Invalid') ||
            error.message?.includes('JWT')) {
          logger.warn('Session error detected, cleaning up auth state');
          enhancedCleanupAuthState();
          setSession(null);
          setUser(null);
          setUserRoles(null);
          setCurrentRole(null);
          setLoading(false);
          return;
        }
      }
      
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
              logger.error('Error fetching initial user roles', error, { component: 'AuthContext' });
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
                  logger.warn('Error parsing stored role', { error: e });
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
      // Set loading to true to prevent Index from showing Landing
      setLoading(true);
      
      // Clean up auth state first
      enhancedCleanupAuthState();
      
      // Clear React state
      setUser(null);
      setSession(null);
      setUserRoles(null);
      setCurrentRole(null);
      
      // Attempt global sign out from Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        logger.warn('Supabase sign out error (continuing anyway)', { error: err });
      }
      
      // Force redirect to auth page without going through Index/Landing
      window.location.replace('/auth');
    } catch (error) {
      logger.error('Error in sign out process', error as Error, { component: 'AuthContext' });
      // Force cleanup and redirect anyway
      enhancedCleanupAuthState();
      window.location.replace('/auth');
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