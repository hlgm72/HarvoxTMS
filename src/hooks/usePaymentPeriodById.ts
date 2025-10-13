import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentPeriodById(periodId?: string) {
  return useQuery({
    queryKey: ['payment-period', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      
      const { data, error } = await supabase
        .from('user_payrolls')
        .select(`
          *,
          period:company_payment_periods!company_payment_period_id(
            period_start_date,
            period_end_date,
            period_frequency
          )
        `)
        .eq('id', periodId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });
}
