import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[] | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceUpdateFlag, setForceUpdateFlag] = useState(0);

  // Fetch user roles
  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return [];
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRoles(null);
      setCurrentRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Switch role function
  const switchRole = (roleId: string) => {
    const role = userRoles?.find(r => r.id === roleId);
    if (role) {
      setCurrentRole(role.role);
    }
  };

  // Refresh roles function
  const refreshRoles = async () => {
    if (user) {
      const roles = await fetchUserRoles(user.id);
      setUserRoles(roles);
    }
  };

  // Force update function
  const _forceUpdate = () => {
    setForceUpdateFlag(prev => prev + 1);
  };

  // Computed properties
  const userRole = userRoles?.find(r => r.role === currentRole) || userRoles?.[0] || null;
  const isAuthenticated = !!user && !!session;
  const availableRoles = userRoles || [];
  const hasMultipleRoles = (userRoles?.length || 0) > 1;
  const isSuperAdmin = userRoles?.some(r => r.role === 'superadmin') || false;
  const isCompanyOwner = userRoles?.some(r => r.role === 'company_owner') || false;
  const isOperationsManager = userRoles?.some(r => r.role === 'operations_manager') || false;
  const isDispatcher = userRoles?.some(r => r.role === 'dispatcher') || false;
  const isDriver = userRoles?.some(r => r.role === 'driver') || false;

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            const roles = await fetchUserRoles(initialSession.user.id);
            setUserRoles(roles);
            setCurrentRole(roles.length > 0 ? roles[0].role : null);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles when user signs in
          setTimeout(async () => {
            if (mounted) {
              const roles = await fetchUserRoles(session.user.id);
              setUserRoles(roles);
              setCurrentRole(roles.length > 0 ? roles[0].role : null);
            }
          }, 0);
        } else {
          // Clear roles when user signs out
          setUserRoles(null);
          setCurrentRole(null);
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    userRoles,
    currentRole,
    signOut,
    signIn,
    signUp,
    loading,
    
    // Additional properties
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
    _forceUpdate,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};