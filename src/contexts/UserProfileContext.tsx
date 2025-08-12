import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  timezone: string | null;
  street_address: string | null;
  state_id: string | null;
  city: string | null;
  zip_code: string | null;
  date_of_birth: string | null;
  hire_date: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  getUserInitials: () => string;
  getFullName: () => string;
  user: any;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  // Add defensive check for AuthContext availability
  const authContext = useAuth();
  const { user } = authContext || { user: null };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getFullName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuario';
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user?.id]);

  // Listen for profile refresh events (e.g., after invitation acceptance)
  useEffect(() => {
    const handleCustomRefresh = (e: CustomEvent) => {
      console.log('🔄 Profile refresh requested via custom event');
      refreshProfile();
      localStorage.removeItem('profile_refresh_needed');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profile_refresh_needed' && e.newValue === 'true') {
        console.log('🔄 Profile refresh requested via storage event');
        refreshProfile();
        localStorage.removeItem('profile_refresh_needed');
      }
    };

    // Listen for custom events (same tab) and storage events (other tabs)
    window.addEventListener('profileRefreshNeeded', handleCustomRefresh as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on mount in case flag was set
    if (localStorage.getItem('profile_refresh_needed') === 'true') {
      console.log('🔄 Profile refresh needed on mount');
      setTimeout(() => {
        refreshProfile();
        localStorage.removeItem('profile_refresh_needed');
      }, 500); // Small delay to ensure user is loaded
    }

    return () => {
      window.removeEventListener('profileRefreshNeeded', handleCustomRefresh as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

  const value: UserProfileContextType = {
    profile,
    loading,
    refreshProfile,
    getUserInitials,
    getFullName,
    user
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};