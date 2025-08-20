import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';

export interface DriverOption {
  value: string;
  label: string;
  user_id: string;
}

export const useDriversList = () => {
  const { user } = useAuth();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  return useQuery({
    queryKey: ['drivers-list', user?.id, userCompany?.company_id],
    queryFn: async (): Promise<DriverOption[]> => {
      if (!user || !userCompany?.company_id) {
        throw new Error('Usuario o compañía no disponible');
      }

      // Estrategia optimizada: obtener roles de conductores primero
      const { data: driverRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompany.company_id)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching driver roles:', rolesError);
        throw rolesError;
      }

      if (!driverRoles || driverRoles.length === 0) {
        return [];
      }

      const driverUserIds = driverRoles.map(role => role.user_id);

      // Obtener perfiles de los conductores por separado
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverUserIds);

      if (profilesError) {
        console.error('Error fetching driver profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        return [];
      }

      // Transformar a formato de opciones
      const driverOptions: DriverOption[] = profiles.map(profile => {
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        
        return {
          value: profile.user_id,
          label: fullName || 'Conductor sin nombre',
          user_id: profile.user_id
        };
      });

      // Ordenar alfabéticamente
      driverOptions.sort((a, b) => a.label.localeCompare(b.label));

      return driverOptions;
    },
    enabled: !!user && !!userCompany?.company_id && !cacheLoading && !cacheError,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};