import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentPeriodById(periodId?: string) {
  return useQuery({
    queryKey: ['payment-period', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      
      const { data, error } = await supabase
        .from('user_payment_periods')
        .select('*')
        .eq('id', periodId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });
}
