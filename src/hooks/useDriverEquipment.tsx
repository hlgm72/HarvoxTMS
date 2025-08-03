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
      
      // Get equipment assignments for driver
      const { data: assignments, error: assignmentsError } = await supabase
        .from('equipment_assignments')
        .select('id, assigned_date, is_active, equipment_id')
        .eq('driver_user_id', driverUserId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (assignmentsError) {
        console.error('🚛 Error fetching equipment assignments:', assignmentsError);
        throw assignmentsError;
      }

      if (!assignments || assignments.length === 0) {
        console.log('🚛 No equipment assignments found for driver');
        return [];
      }

      console.log('🚛 Equipment assignments:', assignments);

      // Get equipment details separately to avoid relationship ambiguity
      const equipmentIds = assignments.map(a => a.equipment_id);
      const { data: equipment, error: equipmentError } = await supabase
        .from('company_equipment')
        .select('id, equipment_number, equipment_type, make, model, year')
        .in('id', equipmentIds);

      if (equipmentError) {
        console.error('🚛 Error fetching equipment details:', equipmentError);
        throw equipmentError;
      }

      console.log('🚛 Equipment details:', equipment);

      // Transform the data to match our interface
      const result = assignments.map(assignment => {
        const equipmentDetail = equipment?.find(eq => eq.id === assignment.equipment_id);
        return {
          id: equipmentDetail?.id || '',
          equipment_number: equipmentDetail?.equipment_number || '',
          equipment_type: equipmentDetail?.equipment_type || 'truck',
          make: equipmentDetail?.make,
          model: equipmentDetail?.model,
          year: equipmentDetail?.year,
          assigned_date: assignment.assigned_date,
          is_active: assignment.is_active,
        };
      }) as DriverEquipment[];
      
      console.log('🚛 Transformed equipment result:', result);
      return result;
    },
    enabled: !!driverUserId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}