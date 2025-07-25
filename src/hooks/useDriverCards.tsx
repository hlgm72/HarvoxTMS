import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriverCard {
  id: string;
  card_number_last_four: string;
  card_provider: string;
  card_identifier?: string;
  is_active: boolean;
  assigned_date: string;
}

export function useDriverCards(driverUserId?: string) {
  return useQuery({
    queryKey: ['driver-cards', driverUserId],
    queryFn: async () => {
      if (!driverUserId) return [];
      
      const { data, error } = await supabase
        .from('driver_cards')
        .select('*')
        .eq('driver_user_id', driverUserId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      return data as DriverCard[];
    },
    enabled: !!driverUserId,
  });
}