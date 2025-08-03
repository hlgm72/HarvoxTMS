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

      // Get dispatchers from user_company_roles
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

      // Get user profiles for all dispatchers
      const userIds = dispatcherRoles.map(role => role.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching dispatcher profiles:', profilesError);
        // Continue without profiles instead of throwing error
      }

      // Create consolidated dispatchers with profile data
      const consolidatedDispatchers: ConsolidatedDispatcher[] = dispatcherRoles.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          id: role.user_id,
          user_id: role.user_id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: '',
          phone: profile?.phone || '',
          hire_date: undefined,
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