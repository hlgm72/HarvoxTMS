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
  console.log('🔧 AuthContext Reducer called:', action.type);
  
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.session, user: action.user };
    case 'SET_ROLES':
      const newState = { 
        ...state, 
        userRoles: [...action.userRoles], 
        currentRole: action.currentRole ? { ...action.currentRole } : null,
        loading: false,
        forceUpdate: Date.now()
      };
      console.log('🔧 AuthContext SET_ROLES:', {
        before: state.userRoles.length,
        after: newState.userRoles.length,
        forceUpdate: newState.forceUpdate
      });
      return newState;
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

  const switchRole = (role: UserRole) => {
    dispatch({ type: 'SET_ROLES', userRoles: authState.userRoles, currentRole: role });
    localStorage.setItem('currentRole', JSON.stringify(role));
  };

  const refreshRoles = async () => {
    if (authState.user) {
      console.log('🔄 AuthContext refreshing roles for user:', authState.user.id);
      // Clear cache to force fresh data
      rolesCache.delete(authState.user.id);
      const roles = await fetchUserRoles(authState.user.id);
      const currentRole = getCurrentRoleFromStorage(roles) || (roles.length > 0 ? roles[0] : null);
      
      console.log('📊 AuthContext setting new roles state:', { roles, currentRole });
      console.log('📊 AuthContext roles count before:', authState.userRoles.length, 'after:', roles.length);
      
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
      
      console.log('🎯 AuthContext reducer dispatch called with roles:', roles.length);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('currentRole');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return;

      dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null });

      if (session?.user) {
        const roles = await fetchUserRoles(session.user.id);
        if (isMounted) {
          // Try to get current role from storage first
          const storedRole = getCurrentRoleFromStorage(roles);
          // If no stored role or stored role is invalid, use first available role
          const currentRole = storedRole || (roles.length > 0 ? roles[0] : null);
          
          dispatch({ 
            type: 'SET_ROLES', 
            userRoles: roles, 
            currentRole 
          });

          // Update stored role if we selected a different one
          if (currentRole && (!storedRole || storedRole.id !== currentRole.id)) {
            localStorage.setItem('currentRole', JSON.stringify(currentRole));
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
      (event, session) => {
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