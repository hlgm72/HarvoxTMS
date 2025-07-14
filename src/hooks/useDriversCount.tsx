import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useDriversCount = () => {
  const [driversCount, setDriversCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDriversCount = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's company roles to find their company
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) {
        setDriversCount(0);
        setLoading(false);
        return;
      }

      const companyId = userRoles[0].company_id;

      // Get count of active drivers in the same company
      const { count, error: countError } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (countError) throw countError;

      setDriversCount(count || 0);
    } catch (error) {
      console.error('Error fetching drivers count:', error);
      setDriversCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversCount();

    // Set up real-time subscription for user_company_roles changes
    const channel = supabase
      .channel('drivers-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_company_roles',
          filter: `role=eq.driver`
        },
        () => {
          // Refresh count when there are changes to driver roles
          fetchDriversCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { driversCount, loading, refreshCount: fetchDriversCount };
};