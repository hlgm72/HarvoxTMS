import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useCompanyCache } from './useCompanyCache';
import { useMemo } from 'react';

export interface ConsolidatedDriver {
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
  termination_date: string | null;
  termination_reason: string | null;
  is_active: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  current_status: 'available' | 'on_route' | 'off_duty' | 'pre_registered';
  active_loads_count: number;
  is_pre_registered: boolean;
  activation_status: 'active' | 'pending_activation' | 'invited';
}

export const useConsolidatedDrivers = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  const queryKey = useMemo(() => {
    return ['consolidated-drivers', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  const driversQuery = useQuery({
    queryKey,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    networkMode: 'online',
    queryFn: async (): Promise<ConsolidatedDriver[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      if (cacheLoading || !userCompany || companyUsers.length === 0) {
        throw new Error('Cargando datos de compañía...');
      }

        try {
        // PASO 1: Obtener conductores activos y pre-registrados
        const { data: driverRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select(`
            user_id,
            termination_date,
            termination_reason,
            is_active
          `)
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true);

        if (rolesError) {
          console.error('Error obteniendo roles de drivers:', rolesError);
          throw new Error('Error obteniendo conductores');
        }

        // PASO 1.5: También obtener invitaciones pendientes para conductores pre-registrados
        const { data: pendingInvitations, error: invitationsError } = await supabase
          .from('user_invitations')
          .select(`
            target_user_id,
            first_name,
            last_name,
            email,
            metadata,
            created_at,
            accepted_at
          `)
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .is('accepted_at', null)  // Solo invitaciones no aceptadas
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString());
          // REMOVED: .not('target_user_id', 'is', null) para incluir todas las invitaciones pendientes

        // Debug log para invitaciones pendientes
        // Debug processing invitaciones pendientes

        const invitedUserIds = pendingInvitations?.map(inv => inv.target_user_id).filter(Boolean) || [];
        const driverUserIds = driverRoles?.map(role => role.user_id) || [];
        const allDriverUserIds = [...new Set([...driverUserIds, ...invitedUserIds])];

        // Si no hay conductores existentes NI invitaciones pendientes, retornar array vacío
        if (allDriverUserIds.length === 0 && (!pendingInvitations || pendingInvitations.length === 0)) {
          return [];
        }

        // PASO 2: Obtener datos relacionados en paralelo
        const [profilesResult, driverProfilesResult, activeLoadsResult] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('user_id, first_name, last_name, phone, avatar_url, hire_date')
            .in('user_id', allDriverUserIds),
          
          // Use basic driver info for consolidated view (non-sensitive data)
          Promise.all(
            allDriverUserIds.map(async (userId) => {
              try {
                const { data } = await supabase.rpc('get_driver_basic_info', {
                  target_user_id: userId
                });
                return data?.[0] || null;
              } catch (error) {
                console.warn(`Failed to fetch driver data for ${userId}:`, error);
                return null;
              }
            })
          ).then(results => ({ data: results.filter(Boolean), error: null })),
          
          supabase
            .from('loads')
            .select('driver_user_id, status')
            .in('driver_user_id', allDriverUserIds)
            .in('status', ['assigned', 'in_transit', 'pickup', 'delivery'])
        ]);

        // PASO 3: Procesar y enriquecer datos
        const [profiles, driverProfiles, activeLoads] = [
          profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [],
          driverProfilesResult.status === 'fulfilled' ? driverProfilesResult.value.data || [] : [],
          activeLoadsResult.status === 'fulfilled' ? activeLoadsResult.value.data || [] : []
        ];

        // Create a comprehensive list including pre-registered drivers
        const allDrivers: ConsolidatedDriver[] = [];

        // First, add drivers with profiles
        profiles.forEach(profile => {
          const driverProfile = driverProfiles.find(dp => dp.user_id === profile.user_id);
          const driverRole = driverRoles?.find(dr => dr.user_id === profile.user_id);
          const driverLoads = activeLoads.filter(load => load.driver_user_id === profile.user_id) || [];
          
          // Check if there's a pending invitation for this user (solo invitaciones NO aceptadas)
          const pendingInvitation = pendingInvitations?.find(inv => inv.target_user_id === profile.user_id);
          
          // Un conductor está activo si:
          // 1. No tiene invitación pendiente (ya aceptó), Y
          // 2. Tiene rol activo, Y
          // 3. Tiene al menos el nombre en el perfil
          const hasBasicProfile = Boolean(profile.first_name || profile.last_name);
          const hasActiveRole = Boolean(driverRole?.is_active);
          
          // Un conductor está pre-registrado solo si tiene invitación pendiente o no tiene rol activo
          const isPreRegistered = Boolean(pendingInvitation) || !hasActiveRole;
          
          // Determine activation status based on available data
          let activationStatus: 'active' | 'pending_activation' | 'invited' = 'active';
          if (Boolean(pendingInvitation)) {
            activationStatus = 'invited'; // Aún no ha aceptado la invitación
          } else if (!hasActiveRole) {
            activationStatus = 'pending_activation'; // Aceptó pero rol no está activo
          } else if (!hasBasicProfile) {
            activationStatus = 'pending_activation'; // Aceptó pero no tiene datos básicos
          }
          
          // Determinar estado actual basado en cargas y activación
          let currentStatus: 'available' | 'on_route' | 'off_duty' | 'pre_registered' = 'available';
          const activeLoadsCount = driverLoads.length;
          
          if (isPreRegistered) {
            currentStatus = 'pre_registered';
          } else if (activeLoadsCount > 0) {
            const hasInTransit = driverLoads.some(load => 
              ['in_transit', 'pickup', 'delivery'].includes(load.status)
            );
            currentStatus = hasInTransit ? 'on_route' : 'available';
          } else if (!driverProfile?.is_active || !driverRole?.is_active) {
            currentStatus = 'off_duty';
          }

          allDrivers.push({
            id: profile.user_id,
            user_id: profile.user_id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            license_number: null, // Hidden in consolidated view for security
            license_expiry_date: driverProfile?.license_expiry_date || null,
            license_state: null, // Hidden in consolidated view for security
            cdl_class: driverProfile?.cdl_class || null,
            license_issue_date: null, // Hidden in consolidated view for security
            hire_date: profile.hire_date || null,
            termination_date: driverRole?.termination_date || null,
            termination_reason: driverRole?.termination_reason || null,
            is_active: driverRole?.is_active ?? true,
            emergency_contact_name: null, // Hidden in consolidated view for security
            emergency_contact_phone: null, // Hidden in consolidated view for security
            current_status: currentStatus,
            active_loads_count: activeLoadsCount,
            is_pre_registered: isPreRegistered,
            activation_status: activationStatus
          });
        });

          // Add drivers that are only invited (no profile yet) - includes invitations without target_user_id
        pendingInvitations?.forEach(invitation => {
          // Skip if already processed (has target_user_id and already in allDrivers)
          if (invitation.target_user_id && allDrivers.some(d => d.user_id === invitation.target_user_id)) {
            return;
          }

          const hireDate = typeof invitation.metadata === 'object' && invitation.metadata && 'hire_date' in invitation.metadata 
            ? invitation.metadata.hire_date as string 
            : null;
          
          // Use target_user_id if available, otherwise generate a unique ID based on email
          const driverId = invitation.target_user_id || `invitation-${invitation.email}`;
          
          allDrivers.push({
            id: driverId,
            user_id: invitation.target_user_id || driverId, // Use the generated ID for invitations without user
            first_name: invitation.first_name || '',
            last_name: invitation.last_name || '',
            phone: null,
            avatar_url: null,
            license_number: null,
            license_expiry_date: null,
            license_state: null,
            cdl_class: null,
            license_issue_date: null,
            hire_date: hireDate,
            termination_date: null,
            termination_reason: null,
            is_active: true,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            current_status: 'available', // Los conductores invitados deben estar disponibles para asignación
            active_loads_count: 0,
            is_pre_registered: true,
            activation_status: 'invited'
          });
        });

        return allDrivers;

        

      } catch (error: any) {
        console.error('Error en useConsolidatedDrivers:', error);
        
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