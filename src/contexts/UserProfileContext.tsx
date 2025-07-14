import React, { createContext, useContext, ReactNode } from 'react';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  timezone: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  getUserInitials: () => string;
  getFullName: () => string;
  user: any;
}

// Simple mock implementation
const mockProfileContext: UserProfileContextType = {
  profile: null,
  loading: false,
  refreshProfile: async () => console.log('Refresh profile'),
  getUserInitials: () => 'U',
  getFullName: () => 'Usuario',
  user: null
};

const UserProfileContext = createContext<UserProfileContextType>(mockProfileContext);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  return context || mockProfileContext;
};

interface UserProfileProviderProps {
  children: ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  console.log('👤 UserProfileProvider rendering with simplified implementation');
  
  return (
    <UserProfileContext.Provider value={mockProfileContext}>
      {children}
    </UserProfileContext.Provider>
  );
};