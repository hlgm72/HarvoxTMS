import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface CompanyData {
  [key: string]: any;
  name: string;
  street_address: string;
  state_id: string;
  zip_code: string;
  city_id?: string;
  phone?: string;
  email?: string;
  dot_number?: string;
  mc_number?: string;
  ein?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_title?: string;
  plan_type?: string;
  max_users?: number;
  max_vehicles?: number;
  default_payment_frequency?: string;
  payment_cycle_start_day?: number;
  payment_day?: string;
  default_leasing_percentage?: number;
  default_factoring_percentage?: number;
  default_dispatching_percentage?: number;
  load_assignment_criteria?: string;
  contract_start_date?: string;
  logo_url?: string;
  status?: string;
}

interface CreateOrUpdateCompanyParams {
  companyData: CompanyData;
  companyId?: string;
}

interface CompanyResponse {
  success: boolean;
  operation: 'CREATE' | 'UPDATE';
  message: string;
  company: any;
  processed_by: string;
  processed_at: string;
}

export const useCompanyManagementACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation<CompanyResponse, Error, CreateOrUpdateCompanyParams>({
    mutationFn: async (params: CreateOrUpdateCompanyParams): Promise<CompanyResponse> => {
      console.log('🔄 useCompanyManagementACID - Procesando empresa:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_or_update_company_with_validation', {
        company_data: params.companyData,
        company_id: params.companyId || null
      });

      if (error) {
        console.error('❌ useCompanyManagementACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useCompanyManagementACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error procesando empresa');
      }

      console.log('✅ useCompanyManagementACID - Empresa procesada exitosamente:', data);
      return data as any as CompanyResponse;
    },
    onSuccess: (data, params) => {
      console.log(`✅ useCompanyManagementACID - ${data.operation} completado exitosamente`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['user-companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      
      // Mostrar mensaje de éxito específico
      const isCreate = data.operation === 'CREATE';
      showSuccess(
        isCreate ? 'Empresa creada' : 'Empresa actualizada',
        `La empresa se ${isCreate ? 'creó' : 'actualizó'} exitosamente con validaciones ACID.`
      );
    },
    onError: (error: Error) => {
      console.error('❌ useCompanyManagementACID - Error:', error);
      
      // Proporcionar mensajes de error específicos
      let errorMessage = error.message;
      if (errorMessage.includes('name es requerido')) {
        showError('Datos incompletos', 'Debe especificar el nombre de la empresa.');
      } else if (errorMessage.includes('street_address es requerido')) {
        showError('Datos incompletos', 'Debe especificar la dirección.');
      } else if (errorMessage.includes('state_id es requerido')) {
        showError('Datos incompletos', 'Debe seleccionar el estado.');
      } else if (errorMessage.includes('zip_code es requerido')) {
        showError('Datos incompletos', 'Debe especificar el código postal.');
      } else if (errorMessage.includes('Ya existe una empresa con el nombre')) {
        showError('Nombre duplicado', 'Ya existe una empresa con ese nombre.');
      } else if (errorMessage.includes('Ya existe una empresa con el número DOT')) {
        showError('DOT duplicado', 'Ya existe una empresa con ese número DOT.');
      } else if (errorMessage.includes('Ya existe una empresa con el número MC')) {
        showError('MC duplicado', 'Ya existe una empresa con ese número MC.');
      } else if (errorMessage.includes('Solo los superadministradores pueden crear empresas')) {
        showError('Sin permisos', 'Solo los superadministradores pueden crear empresas.');
      } else if (errorMessage.includes('Sin permisos para modificar esta empresa')) {
        showError('Sin permisos', 'No tienes autorización para modificar esta empresa.');
      } else {
        showError('Error en gestión de empresa', errorMessage);
      }
    },
  });
};

// Hook para actualización de estado de empresa
export const useCompanyStatusACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation<any, Error, { companyId: string; newStatus: 'active' | 'inactive' | 'suspended' | 'pending'; reason?: string }>({
    mutationFn: async (params) => {
      console.log('🔄 useCompanyStatusACID - Actualizando estado:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('update_company_status_with_validation', {
        target_company_id: params.companyId,
        new_status: params.newStatus,
        status_reason: params.reason || null
      });

      if (error) {
        console.error('❌ useCompanyStatusACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useCompanyStatusACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error actualizando estado');
      }

      console.log('✅ useCompanyStatusACID - Estado actualizado exitosamente:', data);
      return data;
    },
    onSuccess: (data, params) => {
      console.log('✅ useCompanyStatusACID - Actualización completada:', params.companyId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['user-companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-dashboard'] });
      
      showSuccess(
        'Estado actualizado',
        `El estado de la empresa se cambió a "${params.newStatus}" exitosamente con validaciones ACID.`
      );
    },
    onError: (error: Error) => {
      console.error('❌ useCompanyStatusACID - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos para cambiar el estado')) {
        showError('Sin permisos', 'No tienes autorización para cambiar el estado de esta empresa.');
      } else if (errorMessage.includes('Empresa no encontrada')) {
        showError('Empresa no encontrada', 'La empresa especificada no existe.');
      } else if (errorMessage.includes('Estado no válido')) {
        showError('Estado no válido', 'El estado especificado no es válido.');
      } else if (errorMessage.includes('ya está en estado')) {
        showError('Sin cambios', 'La empresa ya está en ese estado.');
      } else {
        showError('Error actualizando estado', errorMessage);
      }
    },
  });
};