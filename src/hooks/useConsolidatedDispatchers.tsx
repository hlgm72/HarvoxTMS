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

      // Obtener dispatchers desde user_company_roles y profiles
      const { data: dispatcherRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select(`
          user_id,
          hire_date,
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

      const dispatcherUserIds = dispatcherRoles.map(role => role.user_id);

      // Obtener perfiles y datos adicionales de company_dispatchers
      const [profilesResult, dispatchersResult] = await Promise.allSettled([
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone')
          .in('user_id', dispatcherUserIds),
        
        supabase
          .from('company_dispatchers')
          .select('user_id, email, first_name, last_name, phone')
          .in('user_id', dispatcherUserIds)
      ]);

      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
      const dispatchers = dispatchersResult.status === 'fulfilled' ? dispatchersResult.value.data || [] : [];

      // Combinar datos priorizando profiles sobre company_dispatchers
      const consolidatedDispatchers: ConsolidatedDispatcher[] = dispatcherRoles.map(role => {
        const profile = profiles.find(p => p.user_id === role.user_id);
        const dispatcher = dispatchers.find(d => d.user_id === role.user_id);

        return {
          id: role.user_id,
          user_id: role.user_id,
          first_name: profile?.first_name || dispatcher?.first_name || '',
          last_name: profile?.last_name || dispatcher?.last_name || '',
          email: dispatcher?.email || '', // Solo está en company_dispatchers
          phone: profile?.phone || dispatcher?.phone || '',
          hire_date: role.hire_date,
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