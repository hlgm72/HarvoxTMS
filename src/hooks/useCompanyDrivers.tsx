import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompanyDrivers = async () => {
      if (!user || userRole?.role !== 'company_owner') {
        setLoading(false);
        return;
      }

      try {
        // Primero obtener la compañía del owner actual
        const { data: ownerRole, error: ownerError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('role', 'company_owner')
          .eq('is_active', true)
          .single();

        if (ownerError || !ownerRole) {
          console.error('Error obteniendo compañía del owner:', ownerError);
          return;
        }

        // Obtener todos los drivers de la compañía
        const { data: driverRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id, company_id')
          .eq('company_id', ownerRole.company_id)
          .eq('role', 'driver')
          .eq('is_active', true);

        if (rolesError) {
          console.error('Error obteniendo roles de drivers:', rolesError);
          return;
        }

        if (!driverRoles || driverRoles.length === 0) {
          setDrivers([]);
          return;
        }

        const driverUserIds = driverRoles.map(role => role.user_id);

        // Obtener información de perfiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone, avatar_url')
          .in('user_id', driverUserIds);

        if (profilesError) {
          console.error('Error obteniendo perfiles:', profilesError);
          return;
        }

        // Obtener información específica de drivers
        const { data: driverProfiles, error: driverProfilesError } = await supabase
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
          .in('user_id', driverUserIds);

        if (driverProfilesError) {
          console.error('Error obteniendo perfiles de drivers:', driverProfilesError);
        }

        // Obtener cargas activas para determinar estado
        const { data: activeLoads, error: loadsError } = await supabase
          .from('loads')
          .select('driver_user_id, status')
          .in('driver_user_id', driverUserIds)
          .in('status', ['assigned', 'in_transit', 'pickup', 'delivery']);

        if (loadsError) {
          console.error('Error obteniendo cargas activas:', loadsError);
        }

        // Combinar toda la información
        const combinedDrivers: CompanyDriver[] = profiles?.map(profile => {
          const driverProfile = driverProfiles?.find(dp => dp.user_id === profile.user_id);
          const driverLoads = activeLoads?.filter(load => load.driver_user_id === profile.user_id) || [];
          
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
        }) || [];

        setDrivers(combinedDrivers);

      } catch (error) {
        console.error('Error general obteniendo drivers:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los conductores",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDrivers();
  }, [user, userRole, toast]);

  return { drivers, loading, refetch: () => setLoading(true) };
};