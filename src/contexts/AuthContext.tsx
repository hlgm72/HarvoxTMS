import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Cache for user roles to avoid redundant queries
const rolesCache = new Map<string, UserRole[]>();

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
  forceUpdate: number;
}

type AuthAction = 
  | { type: 'SET_SESSION'; session: Session | null; user: User | null }
  | { type: 'SET_ROLES'; userRoles: UserRole[]; currentRole: UserRole | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'FORCE_UPDATE' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.session, user: action.user };
    case 'SET_ROLES':
      return { 
        ...state, 
        userRoles: [...action.userRoles], 
        currentRole: action.currentRole ? { ...action.currentRole } : null,
        loading: false,
        forceUpdate: Date.now()
      };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'FORCE_UPDATE':
      return { ...state, forceUpdate: Date.now() };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  refreshRoles: () => Promise<void>;
  userRole: UserRole | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isCompanyOwner: boolean;
  isOperationsManager: boolean;
  isDispatcher: boolean;
  isDriver: boolean;
  isSafetyManager: boolean;
  isGeneralManager: boolean;
  isSeniorDispatcher: boolean;
  hasRole: (role: string) => boolean;
  hasMultipleRoles: boolean;
  availableRoles: UserRole[];
  _forceUpdate: number;
  _debug: {
    rolesCount: number;
    currentRoleId?: string;
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, dispatch] = useReducer(authReducer, {
    user: null,
    session: null,
    userRoles: [],
    currentRole: null,
    loading: true,
    forceUpdate: 0,
  });

  const fetchUserRoles = async (userId: string) => {
    // Check cache first
    if (rolesCache.has(userId)) {
      return rolesCache.get(userId) || [];
    }

    try {
      // Clear any potential cache issues by creating a fresh query
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('id, role, company_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user roles:', error);
        
        // If we get a 406 error, it might be a cache issue, try a different approach
        if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          console.log('Retrying with RPC function...');
          try {
            const { data: rpcData, error: rpcError } = await supabase
              .rpc('get_user_company_roles', { user_id_param: userId });
            
            if (rpcError) throw rpcError;
            
            const roles = rpcData.map((item: any) => ({
              id: `${userId}-${item.company_id}-${item.role}`,
              role: item.role,
              company_id: item.company_id,
              is_active: true
            }));
            
            rolesCache.set(userId, roles);
            return roles;
          } catch (rpcError) {
            console.error('RPC fallback also failed:', rpcError);
            rolesCache.set(userId, []);
            return [];
          }
        }
        
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

  const cleanupAuthStorage = () => {
    // Remove standard auth keys
    localStorage.removeItem('currentRole');
    
    // Remove any potentially conflicting Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        // Don't remove the actual session, just conflicting data
        if (!key.includes('token') && !key.includes('session')) {
          localStorage.removeItem(key);
        }
      }
    });
  };

  const switchRole = (role: UserRole) => {
    dispatch({ type: 'SET_ROLES', userRoles: authState.userRoles, currentRole: role });
    localStorage.setItem('currentRole', JSON.stringify(role));
    
    // Force an update to trigger re-renders
    dispatch({ type: 'FORCE_UPDATE' });
  };

  const refreshRoles = async () => {
    if (authState.user) {
      // Clear cache to force fresh data
      rolesCache.delete(authState.user.id);
      const roles = await fetchUserRoles(authState.user.id);
      const currentRole = getCurrentRoleFromStorage(roles) || (roles.length > 0 ? roles[0] : null);
      
      // Update stored role first
      if (currentRole) {
        localStorage.setItem('currentRole', JSON.stringify(currentRole));
      } else {
        localStorage.removeItem('currentRole');
      }

      // Use reducer to update state
      dispatch({ 
        type: 'SET_ROLES', 
        userRoles: roles, 
        currentRole 
      });
    }
  };

  const signOut = async () => {
    try {
      // Clean up all auth-related storage
      cleanupAuthStorage();
      localStorage.removeItem('currentRole');
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Force page refresh to ensure clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if signout fails
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return;

      dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null });

      if (session?.user) {
        const roles = await fetchUserRoles(session.user.id);
        if (isMounted && roles.length > 0) {
          // Try to get current role from storage first
          const storedRole = getCurrentRoleFromStorage(roles);
          
          let selectedRole: UserRole | null = null;
          
          if (storedRole && roles.some(r => r.id === storedRole.id)) {
            // Use stored role if it's valid
            selectedRole = storedRole;
          } else {
            // Fallback to first role if no valid stored role
            selectedRole = roles[0];
            console.warn('No valid stored role found, using first available role:', selectedRole);
          }
          
          if (selectedRole) {
            dispatch({ 
              type: 'SET_ROLES', 
              userRoles: roles, 
              currentRole: selectedRole 
            });

            // Always update storage to ensure consistency
            localStorage.setItem('currentRole', JSON.stringify(selectedRole));
          }
        }
      } else {
        if (isMounted) {
          dispatch({ 
            type: 'SET_ROLES', 
            userRoles: [], 
            currentRole: null 
          });
          // Clear stored role
          localStorage.removeItem('currentRole');
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Defer data loading to prevent deadlocks
          setTimeout(() => {
            handleSession(session);
          }, 0);
        } else {
          await handleSession(session);
        }
      }
    );

    // Check for existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isMounted) {
        handleSession(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const contextValue: AuthContextType = {
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
    // Debug info
    _forceUpdate: authState.forceUpdate,
    _debug: {
      rolesCount: authState.userRoles.length,
      currentRoleId: authState.currentRole?.id,
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};