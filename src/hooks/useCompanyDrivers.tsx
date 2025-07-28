import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useCompanyCache } from './useCompanyCache';
import { useMemo } from 'react';

export interface CompanyDriver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  license_number: string | null;
  license_expiry_date: string | null;
  license_state: string | null;
  cdl_class: string | null;
  license_issue_date: string | null;
  hire_date: string | null;
  is_active: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  current_status: 'available' | 'on_route' | 'off_duty';
  active_loads_count: number;
}

export const useCompanyDrivers = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Memoizar queryKey para evitar re-renders y deduplicar queries
  const queryKey = useMemo(() => {
    return ['company-drivers', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  const driversQuery = useQuery({
    queryKey,
    retry: 1, // Reducir reintentos para evitar ERR_INSUFFICIENT_RESOURCES
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 300000, // Cache agresivo - 5 minutos
    gcTime: 600000, // 10 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'online',
    queryFn: async (): Promise<CompanyDriver[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      // Esperar a que el cache esté listo
      if (cacheLoading || !userCompany || companyUsers.length === 0) {
        throw new Error('Cargando datos de compañía...');
      }

      try {
        // PASO 1: Obtener roles de conductores de la empresa (usando cache)
        const { data: driverRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true);

        if (rolesError) {
          console.error('Error obteniendo roles de drivers:', rolesError);
          throw new Error('Error obteniendo conductores');
        }

        if (!driverRoles || driverRoles.length === 0) {
          return [];
        }

        const finalDriverUserIds = driverRoles.map(role => role.user_id);

        // PASO 2: Obtener datos relacionados en paralelo
        const [profilesResult, driverProfilesResult, activeLoadsResult] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('user_id, first_name, last_name, phone, avatar_url')
            .in('user_id', finalDriverUserIds),
          
          supabase
            .from('driver_profiles')
            .select(`
              user_id,
              license_number,
              license_expiry_date,
              license_state,
              cdl_class,
              hire_date,
              license_issue_date,
              is_active,
              emergency_contact_name,
              emergency_contact_phone
            `)
            .in('user_id', finalDriverUserIds),
          
          supabase
            .from('loads')
            .select('driver_user_id, status')
            .in('driver_user_id', finalDriverUserIds)
            .in('status', ['assigned', 'in_transit', 'pickup', 'delivery'])
        ]);

        console.log('🔍 useCompanyDrivers - Raw query results:', {
          finalDriverUserIds,
          profilesResult: profilesResult.status === 'fulfilled' ? { 
            data: profilesResult.value.data, 
            error: profilesResult.value.error 
          } : { 
            reason: profilesResult.reason 
          },
          driverProfilesResult: driverProfilesResult.status === 'fulfilled' ? { 
            data: driverProfilesResult.value.data, 
            error: driverProfilesResult.value.error 
          } : { 
            reason: driverProfilesResult.reason 
          },
          activeLoadsResult: activeLoadsResult.status === 'fulfilled' ? { 
            data: activeLoadsResult.value.data, 
            error: activeLoadsResult.value.error 
          } : { 
            reason: activeLoadsResult.reason 
          }
        });

        // PASO 3: Procesar y enriquecer datos
        const [profiles, driverProfiles, activeLoads] = [
          profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [],
          driverProfilesResult.status === 'fulfilled' ? driverProfilesResult.value.data || [] : [],
          activeLoadsResult.status === 'fulfilled' ? activeLoadsResult.value.data || [] : []
        ];

        console.log('🔍 useCompanyDrivers - Processed arrays:', {
          profiles,
          driverProfiles,
          activeLoads
        });

        // Combinar toda la información
        const combinedDrivers: CompanyDriver[] = profiles.map(profile => {
          const driverProfile = driverProfiles.find(dp => dp.user_id === profile.user_id);
          const driverLoads = activeLoads.filter(load => load.driver_user_id === profile.user_id) || [];
          
          // Determinar estado actual basado en cargas
          let currentStatus: 'available' | 'on_route' | 'off_duty' = 'available';
          const activeLoadsCount = driverLoads.length;
          
          if (activeLoadsCount > 0) {
            const hasInTransit = driverLoads.some(load => 
              ['in_transit', 'pickup', 'delivery'].includes(load.status)
            );
            currentStatus = hasInTransit ? 'on_route' : 'available';
          } else if (!driverProfile?.is_active) {
            currentStatus = 'off_duty';
          }

          console.log('🔍 useCompanyDrivers - Processing driver:', {
            user_id: profile.user_id,
            name: `${profile.first_name} ${profile.last_name}`,
            driverProfile: driverProfile,
            license_issue_date: driverProfile?.license_issue_date,
            hire_date: driverProfile?.hire_date
          });

          return {
            id: profile.user_id,
            user_id: profile.user_id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            license_number: driverProfile?.license_number || null,
            license_expiry_date: driverProfile?.license_expiry_date || null,
            license_state: driverProfile?.license_state || null,
            cdl_class: driverProfile?.cdl_class || null,
            license_issue_date: driverProfile?.license_issue_date || null,
            hire_date: driverProfile?.hire_date || null,
            is_active: driverProfile?.is_active ?? true,
            emergency_contact_name: driverProfile?.emergency_contact_name || null,
            emergency_contact_phone: driverProfile?.emergency_contact_phone || null,
            current_status: currentStatus,
            active_loads_count: activeLoadsCount
          };
        });

        return combinedDrivers;

      } catch (error: any) {
        console.error('Error en useCompanyDrivers:', error);
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
        }
        throw error;
      }
    },
    enabled: !!user,
  });

  return {
    drivers: driversQuery.data || [],
    loading: driversQuery.isLoading,
    error: driversQuery.error,
    refetch: driversQuery.refetch
  };
};