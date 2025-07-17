import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { useMemo } from 'react';

export interface CompanyDispatcher {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
}

export const useCompanyDispatchers = () => {
  const { user } = useAuth();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  const queryKey = useMemo(() => {
    return ['company-dispatchers', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🔍 useCompanyDispatchers - Starting query');
      console.log('🔍 User:', user?.id);
      console.log('🔍 UserCompany:', userCompany);
      console.log('🔍 CacheLoading:', cacheLoading);
      console.log('🔍 CacheError:', cacheError);

      if (!user) {
        console.log('❌ No user authenticated');
        throw new Error('User not authenticated');
      }

      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      if (cacheLoading || !userCompany) {
        console.log('⏳ Waiting for company cache...');
        throw new Error('Cargando datos de compañía...');
      }

      console.log('🔍 Querying dispatchers for company:', userCompany.company_id);

      const { data, error } = await supabase
        .from("user_company_roles")
        .select(`
          user_id,
          is_active,
          profiles (
            first_name,
            last_name,
            phone
          )
        `)
        .eq("company_id", userCompany.company_id)
        .eq("role", "dispatcher")
        .eq("is_active", true);

      console.log('🔍 Query result:', { data, error });

      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }

      const result = (data || []).map((item: any) => ({
        user_id: item.user_id,
        first_name: item.profiles?.first_name || null,
        last_name: item.profiles?.last_name || null,
        phone: item.profiles?.phone || null,
        is_active: item.is_active,
      })) as CompanyDispatcher[];

      console.log('✅ Final dispatchers result:', result);
      return result;
    },
    enabled: !!user && !cacheLoading && !!userCompany,
    staleTime: 300000, // 5 minutos
    gcTime: 600000, // 10 minutos
  });
};