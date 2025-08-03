import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompanies } from "./useUserCompanies";

export interface ConsolidatedDispatcher {
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

export function useConsolidatedDispatchers() {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();

  return useQuery({
    queryKey: ['consolidated-dispatchers', selectedCompany?.id],
    queryFn: async (): Promise<ConsolidatedDispatcher[]> => {
      if (!selectedCompany?.id) {
        return [];
      }

      // Get dispatchers from user_company_roles only
      const { data: dispatcherRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select(`
          user_id,
          employment_status,
          created_at,
          updated_at
        `)
        .eq('company_id', selectedCompany.id)
        .eq('role', 'dispatcher')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (rolesError) {
        console.error('Error fetching dispatcher roles:', rolesError);
        throw rolesError;
      }

      if (!dispatcherRoles || dispatcherRoles.length === 0) {
        return [];
      }

      // Create consolidated dispatchers from available data
      const consolidatedDispatchers: ConsolidatedDispatcher[] = dispatcherRoles.map(role => {
        return {
          id: role.user_id,
          user_id: role.user_id,
          first_name: '', // No profile data available
          last_name: '',
          email: '', // No profile data available
          phone: '',
          hire_date: undefined, // hire_date now comes from profiles table
          status: role.employment_status || 'active',
          created_at: role.created_at,
          updated_at: role.updated_at
        };
      });

      return consolidatedDispatchers;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });
}