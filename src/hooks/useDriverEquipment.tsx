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
      
      console.log('🚛 Fetching equipment for driver:', driverUserId);
      
      const { data, error } = await supabase
        .from('equipment_assignments')
        .select(`
          id,
          assigned_date,
          is_active,
          equipment_id,
          company_equipment!inner(
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

      if (error) {
        console.error('🚛 Error fetching driver equipment:', error);
        throw error;
      }
      
      console.log('🚛 Driver equipment data:', data);
      
      // Transform the data to match our interface
      const result = (data || []).map(assignment => ({
        id: assignment.company_equipment.id,
        equipment_number: assignment.company_equipment.equipment_number,
        equipment_type: assignment.company_equipment.equipment_type,
        make: assignment.company_equipment.make,
        model: assignment.company_equipment.model,
        year: assignment.company_equipment.year,
        assigned_date: assignment.assigned_date,
        is_active: assignment.is_active,
      })) as DriverEquipment[];
      
      console.log('🚛 Transformed equipment result:', result);
      return result;
    },
    enabled: !!driverUserId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}