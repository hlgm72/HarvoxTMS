import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyPaymentPeriod {
  id: string;
  company_id: string;
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  period_type: string;
  status: string;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  created_at: string;
  updated_at: string;
}

export function useCompanyPaymentPeriods(companyId?: string) {
  return useQuery({
    queryKey: ['company-payment-periods', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      
      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (error) throw error;
      return data as CompanyPaymentPeriod[];
    },
    enabled: !!companyId,
  });
}