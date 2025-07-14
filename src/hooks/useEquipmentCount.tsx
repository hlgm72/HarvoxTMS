import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useEquipmentCount = () => {
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchEquipmentCount = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get user's company through user_company_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return;
      }

      if (!roles || roles.length === 0) {
        setEquipmentCount(0);
        return;
      }

      // Get equipment count for user's company
      const companyIds = roles.map(role => role.company_id);
      
      const { count, error } = await supabase
        .from('company_equipment')
        .select('*', { count: 'exact', head: true })
        .in('company_id', companyIds)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching equipment count:', error);
        return;
      }

      setEquipmentCount(count || 0);
    } catch (error) {
      console.error('Error fetching equipment count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchEquipmentCount();

      // Set up real-time subscription for company_equipment changes
      const channel = supabase
        .channel('equipment-count-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'company_equipment'
          },
          () => {
            // Refresh count when there are changes to equipment
            fetchEquipmentCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setEquipmentCount(0);
    }
  }, [user?.id]);

  return { equipmentCount, loading, refreshCount: fetchEquipmentCount };
};