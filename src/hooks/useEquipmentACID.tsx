import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface EquipmentData {
  [key: string]: any;
  company_id: string;
  equipment_number: string;
  equipment_type: string;
  make?: string;
  model?: string;
  year?: number;
  vin_number?: string;
  license_plate?: string;
  fuel_type?: string;
  status?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_mileage?: number;
  insurance_expiry_date?: string;
  registration_expiry_date?: string;
  license_plate_expiry_date?: string;
  annual_inspection_expiry_date?: string;
  notes?: string;
}

interface CreateOrUpdateEquipmentParams {
  equipmentData: EquipmentData;
  equipmentId?: string;
}

interface EquipmentResponse {
  success: boolean;
  operation: 'CREATE' | 'UPDATE';
  message: string;
  equipment: any;
  processed_by: string;
  processed_at: string;
}

export const useEquipmentACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation<EquipmentResponse, Error, CreateOrUpdateEquipmentParams>({
    mutationFn: async (params: CreateOrUpdateEquipmentParams): Promise<EquipmentResponse> => {
      console.log('🔄 useEquipmentACID - Procesando equipo:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_or_update_equipment_with_validation', {
        equipment_data: params.equipmentData,
        equipment_id: params.equipmentId || null
      });

      if (error) {
        console.error('❌ useEquipmentACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useEquipmentACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error procesando equipo');
      }

      console.log('✅ useEquipmentACID - Equipo procesado exitosamente:', data);
      return data as any as EquipmentResponse;
    },
    onSuccess: (data, params) => {
      console.log(`✅ useEquipmentACID - ${data.operation} completado exitosamente`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['company-equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments'] });
      
      // Mostrar mensaje de éxito específico
      const isCreate = data.operation === 'CREATE';
      showSuccess(
        isCreate ? 'Equipo creado' : 'Equipo actualizado',
        `El equipo se ${isCreate ? 'creó' : 'actualizó'} exitosamente con validaciones ACID.`
      );
    },
    onError: (error: Error) => {
      console.error('❌ useEquipmentACID - Error:', error);
      
      // Proporcionar mensajes de error específicos
      let errorMessage = error.message;
      if (errorMessage.includes('equipment_number es requerido')) {
        showError('Datos incompletos', 'Debe especificar el número de equipo.');
      } else if (errorMessage.includes('equipment_type es requerido')) {
        showError('Datos incompletos', 'Debe seleccionar el tipo de equipo.');
      } else if (errorMessage.includes('Ya existe un equipo')) {
        showError('Número duplicado', 'Ya existe un equipo con ese número en la empresa.');
      } else if (errorMessage.includes('Sin permisos')) {
        showError('Sin permisos', 'No tienes autorización para gestionar equipos en esta empresa.');
      } else if (errorMessage.includes('Equipo no encontrado')) {
        showError('Equipo no encontrado', 'El equipo que intentas editar no existe o no tienes permisos.');
      } else {
        showError('Error en equipo', errorMessage);
      }
    },
  });
};

// Hook para asignación de equipos
export const useEquipmentAssignmentACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation<any, Error, { equipment_id: string; driver_user_id: string; assignment_type?: string; assigned_date?: string; notes?: string }>({
    mutationFn: async (params) => {
      console.log('🔄 useEquipmentAssignmentACID - Asignando equipo:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('assign_equipment_with_validation', {
        assignment_data: params
      });

      if (error) {
        console.error('❌ useEquipmentAssignmentACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useEquipmentAssignmentACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error asignando equipo');
      }

      console.log('✅ useEquipmentAssignmentACID - Equipo asignado exitosamente:', data);
      return data;
    },
    onSuccess: (data, params) => {
      console.log('✅ useEquipmentAssignmentACID - Asignación completada:', params.equipment_id);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['driver-equipment'] });
      
      showSuccess(
        'Equipo asignado',
        'El equipo se asignó exitosamente al conductor con validaciones ACID.'
      );
    },
    onError: (error: Error) => {
      console.error('❌ useEquipmentAssignmentACID - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos para asignar')) {
        showError('Sin permisos', 'No tienes autorización para asignar este equipo.');
      } else if (errorMessage.includes('Conductor no encontrado')) {
        showError('Conductor no válido', 'El conductor seleccionado no pertenece a esta empresa.');
      } else if (errorMessage.includes('ya está asignado')) {
        showError('Equipo ocupado', 'El equipo ya está asignado a otro conductor activo.');
      } else {
        showError('Error asignando equipo', errorMessage);
      }
    },
  });
};

// Hook para desasignación de equipos
export const useEquipmentUnassignmentACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation<any, Error, { assignmentId: string; reason?: string }>({
    mutationFn: async (params) => {
      console.log('🔄 useEquipmentUnassignmentACID - Desasignando equipo:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('unassign_equipment_with_validation', {
        assignment_id: params.assignmentId,
        unassignment_reason: params.reason || null
      });

      if (error) {
        console.error('❌ useEquipmentUnassignmentACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useEquipmentUnassignmentACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error desasignando equipo');
      }

      console.log('✅ useEquipmentUnassignmentACID - Equipo desasignado exitosamente:', data);
      return data;
    },
    onSuccess: (data, params) => {
      console.log('✅ useEquipmentUnassignmentACID - Desasignación completada:', params.assignmentId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['driver-equipment'] });
      
      showSuccess(
        'Equipo desasignado',
        'El equipo se desasignó exitosamente con validaciones ACID.'
      );
    },
    onError: (error: Error) => {
      console.error('❌ useEquipmentUnassignmentACID - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos')) {
        showError('Sin permisos', 'No tienes autorización para desasignar este equipo.');
      } else if (errorMessage.includes('Asignación no encontrada')) {
        showError('Asignación no encontrada', 'La asignación que intentas modificar no existe.');
      } else if (errorMessage.includes('ya está inactiva')) {
        showError('Ya desasignado', 'La asignación ya está inactiva.');
      } else {
        showError('Error desasignando equipo', errorMessage);
      }
    },
  });
};