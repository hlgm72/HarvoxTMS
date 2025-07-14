import React, { createContext, useContext } from 'react';

interface UserRole {
  role: string;
  company_id: string;
  is_active: boolean;
  id: string;
}

interface AuthContextType {
  user: any | null;
  session: any | null;
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

// Simple mock implementation to avoid useState issues
const mockAuthContext: AuthContextType = {
  user: null,
  session: null,
  userRoles: null,
  currentRole: null,
  signOut: async () => { console.log('Sign out'); },
  signIn: async (email: string, password: string) => {
    console.log('Sign in attempt:', email);
    return { error: null };
  },
  signUp: async (email: string, password: string) => {
    console.log('Sign up attempt:', email);
    return { error: null };
  },
  loading: false,
  userRole: null,
  isAuthenticated: false,
  availableRoles: [],
  hasMultipleRoles: false,
  isSuperAdmin: false,
  isCompanyOwner: false,
  isOperationsManager: false,
  isDispatcher: false,
  isDriver: false,
  switchRole: (roleId: string) => console.log('Switch role:', roleId),
  refreshRoles: async () => console.log('Refresh roles'),
  _forceUpdate: () => console.log('Force update')
};

const AuthContext = createContext<AuthContextType>(mockAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || mockAuthContext;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🔐 AuthProvider rendering with simplified implementation');
  
  return (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );
};