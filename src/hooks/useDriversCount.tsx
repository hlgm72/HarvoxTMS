import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { useMemo, useEffect } from 'react';

export const useDriversCount = () => {
  const { user } = useAuth();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();
  const queryClient = useQueryClient();

  // Memoizar queryKey para cache eficiente
  const queryKey = useMemo(() => {
    return ['drivers-count', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  // Configurar escucha en tiempo real
  useEffect(() => {
    if (!userCompany?.company_id) return;

    const channel = supabase
      .channel('drivers-count-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_company_roles',
          filter: `company_id=eq.${userCompany.company_id}`
        },
        () => {
          console.log('🔄 Roles actualizados, invalidando contador de conductores');
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'user_invitations',
          filter: `company_id=eq.${userCompany.company_id}`
        },
        () => {
          console.log('🔄 Invitaciones actualizadas, invalidando contador de conductores');
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userCompany?.company_id, queryClient, queryKey]);

  const driversCountQuery = useQuery({
    queryKey,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000, // Cache menos agresivo - 30 segundos  
    gcTime: 300000, // 5 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'online',
    queryFn: async (): Promise<number> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      // Esperar a que el cache esté listo
      if (cacheLoading || !userCompany) {
        throw new Error('Cargando datos de compañía...');
      }

      try {
        // Obtener todos los drivers activos (roles activos)
        const { data: activeDriverRoles, error: activeDriversError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true);

        if (activeDriversError) {
          console.error('Error obteniendo drivers activos:', activeDriversError);
          throw activeDriversError;
        }

        // Obtener invitaciones pendientes (no aceptadas)
        const { data: pendingInvitations, error: pendingInvitationsError } = await supabase
          .from('user_invitations')
          .select('target_user_id')
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString());

        if (pendingInvitationsError) {
          console.error('Error obteniendo invitaciones pendientes:', pendingInvitationsError);
          throw pendingInvitationsError;
        }

        // Contar drivers únicos: roles activos + invitaciones pendientes sin target_user_id duplicado
        const activeDriverIds = new Set(activeDriverRoles?.map(r => r.user_id) || []);
        const pendingInvitationIds = pendingInvitations?.filter(inv => 
          inv.target_user_id && !activeDriverIds.has(inv.target_user_id)
        ) || [];
        const pendingWithoutTargetUser = pendingInvitations?.filter(inv => !inv.target_user_id) || [];

        const finalCount = activeDriverIds.size + pendingInvitationIds.length + pendingWithoutTargetUser.length;
        return finalCount;

      } catch (error: any) {
        console.error('Error en useDriversCount:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Función para invalidar manualmente el cache
  const invalidateCount = () => {
    console.log('🔄 Invalidando contador de conductores manualmente', queryKey);
    queryClient.invalidateQueries({ queryKey });
  };

  return { 
    driversCount: driversCountQuery.data || 0, 
    loading: driversCountQuery.isLoading, 
    refreshCount: driversCountQuery.refetch,
    invalidateCount
  };
};