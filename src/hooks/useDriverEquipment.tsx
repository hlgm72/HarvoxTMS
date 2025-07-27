import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriverEquipment {
  id: string;
  equipment_number: string;
  equipment_type: string;
  make?: string;
  model?: string;
  year?: number;
  assigned_date: string;
  is_active: boolean;
}

export function useDriverEquipment(driverUserId?: string) {
  return useQuery({
    queryKey: ['driver-equipment', driverUserId],
    queryFn: async () => {
      if (!driverUserId) return [];
      
      const { data, error } = await supabase
        .from('equipment_assignments')
        .select(`
          id,
          assigned_date,
          is_active,
          equipment:company_equipment!inner(
            id,
            equipment_number,
            equipment_type,
            make,
            model,
            year
          )
        `)
        .eq('driver_user_id', driverUserId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(assignment => ({
        id: assignment.equipment.id,
        equipment_number: assignment.equipment.equipment_number,
        equipment_type: assignment.equipment.equipment_type,
        make: assignment.equipment.make,
        model: assignment.equipment.model,
        year: assignment.equipment.year,
        assigned_date: assignment.assigned_date,
        is_active: assignment.is_active,
      })) as DriverEquipment[];
    },
    enabled: !!driverUserId,
  });
}