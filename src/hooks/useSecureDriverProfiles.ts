import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Type definitions for secure driver data access
export interface DriverBasicInfo {
  user_id: string;
  license_expiry_date: string | null;
  cdl_class: string | null;
  is_active: boolean;
}

export interface DriverSensitiveInfo {
  user_id: string;
  license_number: string | null;
  license_state: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  cdl_class: string | null;
  cdl_endorsements: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface DriverProfileUpdate {
  driver_id?: string;
  license_number?: string;
  license_state?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  cdl_class?: string;
  cdl_endorsements?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active?: boolean;
}

/**
 * Secure hook for accessing basic driver information (less sensitive data)
 * Automatically logs access for audit purposes
 */
export const useDriverBasicInfo = (driverUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['driver-basic-info', driverUserId],
    queryFn: async (): Promise<DriverBasicInfo | null> => {
      if (!user || !driverUserId) return null;

      const { data, error } = await supabase.rpc('get_driver_basic_info', {
        target_user_id: driverUserId
      });

      if (error) {
        console.error('Error fetching driver basic info:', error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!user && !!driverUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Secure hook for accessing sensitive driver information (highly sensitive data)
 * Restricted to driver themselves, company owners, and superadmins only
 * Automatically logs access for audit purposes
 */
export const useDriverSensitiveInfo = (driverUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['driver-sensitive-info', driverUserId],
    queryFn: async (): Promise<DriverSensitiveInfo | null> => {
      if (!user || !driverUserId) return null;

      const { data, error } = await supabase.rpc('get_driver_sensitive_info', {
        target_user_id: driverUserId
      });

      if (error) {
        console.error('Error fetching driver sensitive info:', error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!user && !!driverUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter cache for sensitive data)
  });
};

/**
 * Secure mutation for updating driver profiles
 * Only allows updates by the driver themselves or authorized company admins
 */
export const useUpdateDriverProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      driverUserId, 
      updates 
    }: { 
      driverUserId: string; 
      updates: DriverProfileUpdate;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('driver_profiles')
        .update(updates)
        .eq('user_id', driverUserId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { driverUserId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['driver-basic-info', driverUserId] });
      queryClient.invalidateQueries({ queryKey: ['driver-sensitive-info', driverUserId] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
    },
  });
};

/**
 * Secure mutation for creating driver profiles
 * Only allows creation by authorized company admins or the driver themselves
 */
export const useCreateDriverProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      driverUserId, 
      profileData 
    }: { 
      driverUserId: string; 
      profileData: DriverProfileUpdate;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: driverUserId,
          ...profileData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { driverUserId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['driver-basic-info', driverUserId] });
      queryClient.invalidateQueries({ queryKey: ['driver-sensitive-info', driverUserId] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
    },
  });
};

/**
 * Hook to check if current user can access sensitive driver data
 */
export const useCanAccessDriverSensitiveData = (driverUserId: string) => {
  const { user, userRoles } = useAuth();

  if (!user || !driverUserId) return false;

  // Driver can access their own data
  if (user.id === driverUserId) return true;

  // Company owners and superadmins can access data within their company
  return userRoles?.some(role => 
    role.role === 'company_owner' || role.role === 'superadmin'
  ) || false;
};