import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePaymentPeriodById(periodId?: string) {
  return useQuery({
    queryKey: ['payment-period', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      
      console.log('🔍 Buscando período con ID:', periodId);
      
      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('*')
        .eq('id', periodId)
        .single();
      
      if (error) {
        console.error('❌ Error obteniendo período:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!periodId
  });
}