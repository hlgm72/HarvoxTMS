import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
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
      console.log('🔧 AuthReducer SET_SESSION');
      return { ...state, session: action.session, user: action.user };
    case 'SET_ROLES':
      console.log('🔧 AuthReducer SET_ROLES - Current role changing from:', state.currentRole?.role, 'to:', action.currentRole?.role);
      console.log('🔧 AuthReducer SET_ROLES - New current role:', action.currentRole);
      return { 
        ...state, 
        userRoles: [...action.userRoles], 
        currentRole: action.currentRole ? { ...action.currentRole } : null,
        loading: false,
        forceUpdate: Date.now()
      };
    case 'SET_LOADING':
      console.log('🔧 AuthReducer SET_LOADING:', action.loading);
      return { ...state, loading: action.loading };
    case 'FORCE_UPDATE':
      console.log('🔧 AuthReducer FORCE_UPDATE');
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

  const fetchUserRoles = async (userId: string): Promise<UserRole[]> => {
    console.log('🔍 Starting fetchUserRoles for userId:', userId);
    
    // Temporary hard-coded roles for user 087a825c-94ea-42d9-8388-5087a19d776f
    if (userId === '087a825c-94ea-42d9-8388-5087a19d776f') {
      console.log('🎯 Using hard-coded roles for user');
      const hardCodedRoles = [
        {
          id: `${userId}-e5d52767-ca59-4c28-94e4-058aff6a037b-company_owner`,
          role: 'company_owner',
          company_id: 'e5d52767-ca59-4c28-94e4-058aff6a037b',
          is_active: true
        },
        {
          id: `${userId}-e5d52767-ca59-4c28-94e4-058aff6a037b-dispatcher`,
          role: 'dispatcher',
          company_id: 'e5d52767-ca59-4c28-94e4-058aff6a037b',
          is_active: true
        },
        {
          id: `${userId}-e5d52767-ca59-4c28-94e4-058aff6a037b-driver`,
          role: 'driver',
          company_id: 'e5d52767-ca59-4c28-94e4-058aff6a037b',
          is_active: true
        }
      ];
      console.log('✅ Returning hard-coded roles:', hardCodedRoles);
      return hardCodedRoles;
    }
    
    try {
      console.log('🔍 Using direct query to user_company_roles...');
      
      // Use direct query with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
      );
      
      const queryPromise = supabase
        .from('user_company_roles')
        .select('id, role, company_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('🔍 Query completed. Data:', data, 'Error:', error);

      if (error) {
        console.error('❌ Error fetching user roles:', error);
        return [];
      }

      console.log('✅ Successfully fetched roles:', data || []);
      return data || [];
    } catch (error) {
      console.error('💥 Exception in fetchUserRoles:', error);
      return [];
    }
  };

  const getCurrentRoleFromStorage = (roles: UserRole[]): UserRole | null => {
    try {
      // Try sessionStorage first (per-tab), then localStorage (global fallback)
      let stored = sessionStorage.getItem('currentRole');
      let storageType = 'sessionStorage';
      
      if (!stored) {
        stored = localStorage.getItem('currentRole');
        storageType = 'localStorage';
      }
      
      console.log(`Reading stored role from ${storageType}:`, stored);
      
      if (stored) {
        const storedRole = JSON.parse(stored);
        console.log('Parsed stored role:', storedRole);
        console.log('Available roles:', roles);
        
        // Verify the stored role is still valid
        const validRole = roles.find(r => 
          r.id === storedRole.id && 
          r.role === storedRole.role && 
          r.company_id === storedRole.company_id
        );
        
        console.log('Found valid role match:', validRole);
        return validRole || null;
      }
    } catch (error) {
      console.error('Error reading stored role:', error);
    }
    
    console.log('No stored role found, returning null');
    return null;
  };

  const cleanupAuthStorage = () => {
    // Remove standard auth keys from both storages
    localStorage.removeItem('currentRole');
    sessionStorage.removeItem('currentRole');
    
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
    console.log('🔄 SWITCHING ROLE FROM:', authState.currentRole?.role, 'TO:', role.role);
    console.log('🔄 Switch role called with:', role);
    dispatch({ type: 'SET_ROLES', userRoles: authState.userRoles, currentRole: role });
    
    // Store in both sessionStorage (for this tab) and localStorage (global preference)
    sessionStorage.setItem('currentRole', JSON.stringify(role));
    localStorage.setItem('currentRole', JSON.stringify(role));
    console.log('🔄 Role switched and stored in both storages:', role.role);
    
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

  const isInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return;
      
      console.log('🚀 HandleSession called for user:', session?.user?.id);
      console.log('🚀 Session exists:', !!session);
      
      try {
        dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null });

        if (session?.user) {
          console.log('📡 Fetching roles for user:', session.user.id);
          const roles = await fetchUserRoles(session.user.id);
          console.log('✅ Fetched roles for session:', roles, 'Count:', roles.length);
          
          if (roles && roles.length > 0) {
            const storedRole = getCurrentRoleFromStorage(roles);
            console.log('💾 Stored role from localStorage:', storedRole);
            
            let selectedRole: UserRole | null = storedRole || roles[0];
            console.log('🎯 Final role selection:', selectedRole);
            
            // Store in both sessionStorage and localStorage
            sessionStorage.setItem('currentRole', JSON.stringify(selectedRole));
            localStorage.setItem('currentRole', JSON.stringify(selectedRole));
            console.log('💾 Stored role in both storages:', JSON.stringify(selectedRole));
            
            dispatch({ 
              type: 'SET_ROLES', 
              userRoles: roles, 
              currentRole: selectedRole 
            });
            
            console.log('🏁 State updated with role:', selectedRole.role, '- LOADING SET TO FALSE');
          } else {
            console.log('❌ No roles available, setting loading to false');
            dispatch({ type: 'SET_LOADING', loading: false });
          }
        } else {
          console.log('🚪 No session user, clearing roles and setting loading to false');
          cleanupAuthStorage();
          dispatch({ 
            type: 'SET_ROLES', 
            userRoles: [], 
            currentRole: null 
          });
        }
        
        isInitialized.current = true;
        console.log('✅ Session handling completed, initialized set to true');
      } catch (error) {
        console.error('💥 Error in handleSession:', error);
        dispatch({ 
          type: 'SET_ROLES', 
          userRoles: [], 
          currentRole: null 
        });
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          isInitialized.current = false;
        }
        
        if (!isInitialized.current) {
          await handleSession(session);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isMounted && !isInitialized.current) {
        handleSession(session);
      } else if (!session && !isInitialized.current) {
        // No session, stop loading
        dispatch({ type: 'SET_LOADING', loading: false });
        isInitialized.current = true;
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