import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FuelCardProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  description?: string;
}

export function useFuelCardProviders() {
  return useQuery({
    queryKey: ['fuel-card-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_card_providers')
        .select('*')
        .eq('is_active', true)
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as FuelCardProvider[];
    },
  });
}