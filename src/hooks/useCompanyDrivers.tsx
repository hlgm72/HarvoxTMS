import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
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
  hire_date: string | null;
  is_active: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  current_status: 'available' | 'on_route' | 'off_duty';
  active_loads_count: number;
}

export const useCompanyDrivers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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
      console.log('🔄 useCompanyDrivers iniciando...');
      console.time('useCompanyDrivers-TOTAL-TIME');
      
      if (!user) {
        console.log('❌ Usuario no autenticado');
        throw new Error('User not authenticated');
      }

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      // Esperar a que el cache esté listo
      if (cacheLoading || !userCompany || companyUsers.length === 0) {
        console.log('⏳ Esperando cache de compañía...');
        throw new Error('Cargando datos de compañía...');
      }

      try {
        // Filtrar solo usuarios que son conductores
        console.time('step-1-filter-drivers');
        const driverUserIds = companyUsers.filter(userId => {
          // Solo incluir usuarios que tengan rol de driver
          // Esta información ya viene del cache
          return true; // El cache ya filtra por company_id, aquí necesitamos verificar rol
        });
        console.timeEnd('step-1-filter-drivers');

        // PASO 1: Obtener roles de conductores de la empresa (usando cache)
        console.time('step-2-driver-roles');
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
          console.timeEnd('step-2-driver-roles');
          console.timeEnd('useCompanyDrivers-TOTAL-TIME');
          console.log('✅ useCompanyDrivers completado: Sin conductores encontrados');
          return [];
        }

        const finalDriverUserIds = driverRoles.map(role => role.user_id);
        console.log(`👥 Conductores encontrados: ${finalDriverUserIds.length}`);
        console.timeEnd('step-2-driver-roles');

        // PASO 2: Obtener datos relacionados en paralelo
        console.time('step-3-parallel-queries');
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
        console.timeEnd('step-3-parallel-queries');

        // PASO 3: Procesar y enriquecer datos
        console.time('step-4-data-enrichment');
        const [profiles, driverProfiles, activeLoads] = [
          profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [],
          driverProfilesResult.status === 'fulfilled' ? driverProfilesResult.value.data || [] : [],
          activeLoadsResult.status === 'fulfilled' ? activeLoadsResult.value.data || [] : []
        ];

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
            hire_date: driverProfile?.hire_date || null,
            is_active: driverProfile?.is_active ?? true,
            emergency_contact_name: driverProfile?.emergency_contact_name || null,
            emergency_contact_phone: driverProfile?.emergency_contact_phone || null,
            current_status: currentStatus,
            active_loads_count: activeLoadsCount
          };
        });

        console.timeEnd('step-4-data-enrichment');
        console.timeEnd('useCompanyDrivers-TOTAL-TIME');
        console.log(`✅ useCompanyDrivers completado: ${combinedDrivers.length} conductores procesados`);

        return combinedDrivers;

      } catch (error: any) {
        console.error('Error en useCompanyDrivers:', error);
        console.timeEnd('useCompanyDrivers-TOTAL-TIME');
        
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