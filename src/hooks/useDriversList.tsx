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

      // Obtener usuarios de la compañía con rol de conductor
      const { data: companyUsers, error: usersError } = await (supabase as any)
        .from('company_users')
        .select(`
          user_id,
          roles,
          profiles!inner(
            user_id,
            first_name,
            last_name
          )
        `)
        .eq('company_id', userCompany.company_id)
        .contains('roles', ['driver']);

      if (usersError) {
        console.error('Error fetching company drivers:', usersError);
        throw usersError;
      }

      if (!companyUsers || companyUsers.length === 0) {
        return [];
      }

      // Transformar a formato de opciones
      const driverOptions: DriverOption[] = companyUsers.map((companyUser: any) => {
        const profile = companyUser.profiles;
        const fullName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : 'Sin nombre';
        
        return {
          value: companyUser.user_id,
          label: fullName || 'Conductor sin nombre',
          user_id: companyUser.user_id
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