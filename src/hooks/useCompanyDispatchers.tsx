import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompanies } from "./useUserCompanies";

export interface CompanyDispatcher {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  hire_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useCompanyDispatchers() {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();

  return useQuery({
    queryKey: ['company-dispatchers', selectedCompany?.id],
    queryFn: async (): Promise<CompanyDispatcher[]> => {
      if (!selectedCompany?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('company_dispatchers')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          hire_date,
          status,
          created_at,
          updated_at
        `)
        .eq('company_id', selectedCompany.id)
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching company dispatchers:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });
}