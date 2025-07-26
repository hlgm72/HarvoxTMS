import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EquipmentAssignment {
  id: string;
  equipment_id: string;
  driver_user_id: string;
  assigned_date: string;
  unassigned_date?: string;
  assignment_type: string;
  is_active: boolean;
  notes?: string;
  assigned_by?: string;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  company_equipment?: {
    id: string;
    equipment_number: string;
    equipment_type: string;
    make?: string;
    model?: string;
    year?: number;
    license_plate?: string;
    status: string;
  };
  profiles?: {
    user_id: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface CreateAssignmentData {
  equipment_id: string;
  driver_user_id: string;
  assignment_type: 'permanent' | 'temporary';
  notes?: string;
}

export function useEquipmentAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener todas las asignaciones activas de la empresa
  const assignmentsQuery = useQuery({
    queryKey: ['equipment-assignments'],
    queryFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('equipment_assignments')
        .select(`
          *,
          company_equipment(
            id,
            equipment_number,
            equipment_type,
            make,
            model,
            year,
            license_plate,
            status,
            company_id
          ),
          profiles!driver_user_id(
            user_id,
            first_name,
            last_name
          )
        `)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      return data as any; // Type assertion for complex join query
    },
    enabled: !!user,
  });

  // Obtener asignaciones por conductor
  const getAssignmentsByDriver = (driverUserId: string) => {
    return assignmentsQuery.data?.filter(
      assignment => assignment.driver_user_id === driverUserId
    ) || [];
  };

  // Obtener asignación por equipo
  const getAssignmentByEquipment = (equipmentId: string) => {
    return assignmentsQuery.data?.find(
      assignment => assignment.equipment_id === equipmentId
    );
  };

  // Crear nueva asignación
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: CreateAssignmentData) => {
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar que el equipo no esté ya asignado
      const existingAssignment = getAssignmentByEquipment(assignmentData.equipment_id);
      if (existingAssignment) {
        throw new Error('Este equipo ya está asignado a otro conductor');
      }

      const { data, error } = await supabase
        .from('equipment_assignments')
        .insert({
          ...assignmentData,
          assigned_by: user.id,
          assigned_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments'] });
      toast.success('Equipo asignado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al asignar equipo', {
        description: error.message,
      });
    },
  });

  // Desasignar equipo (marcar como inactivo)
  const unassignEquipmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('equipment_assignments')
        .update({
          is_active: false,
          unassigned_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments'] });
      toast.success('Equipo desasignado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al desasignar equipo', {
        description: error.message,
      });
    },
  });

  // Transferir asignación a otro conductor
  const transferAssignmentMutation = useMutation({
    mutationFn: async ({ 
      assignmentId, 
      newDriverUserId, 
      notes 
    }: { 
      assignmentId: string; 
      newDriverUserId: string; 
      notes?: string; 
    }) => {
      if (!user) throw new Error('Usuario no autenticado');

      // Primero desactivar la asignación actual
      await supabase
        .from('equipment_assignments')
        .update({
          is_active: false,
          unassigned_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', assignmentId);

      // Obtener datos del equipo de la asignación actual
      const currentAssignment = assignmentsQuery.data?.find(a => a.id === assignmentId);
      if (!currentAssignment) throw new Error('Asignación no encontrada');

      // Crear nueva asignación
      const { data, error } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: currentAssignment.equipment_id,
          driver_user_id: newDriverUserId,
          assignment_type: currentAssignment.assignment_type,
          assigned_by: user.id,
          assigned_date: new Date().toISOString().split('T')[0],
          notes: notes || `Transferido desde ${currentAssignment.profiles?.first_name || 'conductor anterior'}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments'] });
      toast.success('Equipo transferido exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al transferir equipo', {
        description: error.message,
      });
    },
  });

  return {
    // Datos
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    error: assignmentsQuery.error,
    
    // Helpers
    getAssignmentsByDriver,
    getAssignmentByEquipment,
    
    // Mutaciones
    createAssignment: createAssignmentMutation.mutate,
    isCreatingAssignment: createAssignmentMutation.isPending,
    
    unassignEquipment: unassignEquipmentMutation.mutate,
    isUnassigning: unassignEquipmentMutation.isPending,
    
    transferAssignment: transferAssignmentMutation.mutate,
    isTransferring: transferAssignmentMutation.isPending,
    
    // Refetch
    refetch: assignmentsQuery.refetch,
  };
}