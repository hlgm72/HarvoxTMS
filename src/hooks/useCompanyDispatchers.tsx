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
      // console.log('🔍 useCompanyDispatchers - Starting query');
      // console.log('🔍 User:', user?.id);
      // console.log('🔍 UserCompany:', userCompany);
      // console.log('🔍 CacheLoading:', cacheLoading);
      // console.log('🔍 CacheError:', cacheError);

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

      // console.log('🔍 Querying dispatchers for company:', userCompany.company_id);

      // PASO 1: Obtener roles de dispatchers de la empresa
      const { data: dispatcherRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompany.company_id)
        .eq('role', 'dispatcher')
        .eq('is_active', true);

      // console.log('🔍 Dispatcher roles result:', { dispatcherRoles, rolesError });

      if (rolesError) {
        console.error('❌ Roles query error:', rolesError);
        throw rolesError;
      }

      if (!dispatcherRoles || dispatcherRoles.length === 0) {
        // console.log('ℹ️ No dispatcher roles found');
        return [];
      }

      const dispatcherUserIds = dispatcherRoles.map(role => role.user_id);
      // console.log('🔍 Dispatcher user IDs:', dispatcherUserIds);

      // PASO 2: Obtener profiles de estos usuarios
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', dispatcherUserIds);

      // console.log('🔍 Profiles result:', { profiles, profilesError });

      if (profilesError) {
        console.error('❌ Profiles query error:', profilesError);
        throw profilesError;
      }

      const result = (profiles || []).map((profile: any) => ({
        user_id: profile.user_id,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        phone: profile.phone || null,
        is_active: true, // Ya filtrado por is_active en la primera consulta
      })) as CompanyDispatcher[];

      // console.log('✅ Final dispatchers result:', result);
      return result;
    },
    enabled: !!user && !cacheLoading && !!userCompany,
    staleTime: 300000, // 5 minutos
    gcTime: 600000, // 10 minutos
  });
};