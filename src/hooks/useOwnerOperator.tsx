import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OwnerOperatorData {
  id: string;
  user_id: string;
  business_name?: string;
  business_type?: string;
  tax_id?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  insurance_pay?: number;
  factoring_percentage?: number;
  dispatching_percentage?: number;
  leasing_percentage?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useOwnerOperator = (driverUserId?: string) => {
  const query = useQuery({
    queryKey: ['owner-operator', driverUserId],
    enabled: !!driverUserId,
    queryFn: async (): Promise<OwnerOperatorData | null> => {
      if (!driverUserId) return null;
      
      const { data, error } = await supabase
        .from('owner_operators')
        .select('*')
        .eq('user_id', driverUserId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching owner operator data:', error);
        throw error;
      }
      
      return data;
    },
  });

  return {
    ownerOperator: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isOwnerOperator: !!query.data,
    refetch: query.refetch,
  };
};