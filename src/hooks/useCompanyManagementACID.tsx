import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

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
  // Owner data (handled separately for security)
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
  const { t } = useTranslation('common');

  return useMutation<CompanyResponse, Error, CreateOrUpdateCompanyParams>({
    mutationFn: async (params: CreateOrUpdateCompanyParams): Promise<CompanyResponse> => {
      console.log('🔄 useCompanyManagementACID - Procesando empresa:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_or_update_company_with_validation', {
        company_data: params.companyData,
        target_company_id: params.companyId || null
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
        showError(t('messages.companies.incomplete_data'), t('messages.companies.name_required'));
      } else if (errorMessage.includes('street_address es requerido')) {
        showError(t('messages.companies.incomplete_data'), t('messages.companies.address_required'));
      } else if (errorMessage.includes('state_id es requerido')) {
        showError(t('messages.companies.incomplete_data'), t('messages.companies.state_required'));
      } else if (errorMessage.includes('zip_code es requerido')) {
        showError(t('messages.companies.incomplete_data'), t('messages.companies.zip_required'));
      } else if (errorMessage.includes('Ya existe una empresa con el nombre')) {
        showError(t('messages.companies.duplicate_name'), t('messages.companies.name_exists'));
      } else if (errorMessage.includes('Ya existe una empresa con el número DOT')) {
        showError(t('messages.companies.duplicate_dot'), t('messages.companies.dot_exists'));
      } else if (errorMessage.includes('Ya existe una empresa con el número MC')) {
        showError(t('messages.companies.duplicate_mc'), t('messages.companies.mc_exists'));
      } else if (errorMessage.includes('Solo los superadministradores pueden crear empresas')) {
        showError(t('messages.companies.no_permissions'), t('messages.companies.superadmin_only'));
      } else if (errorMessage.includes('Sin permisos para modificar esta empresa')) {
        showError(t('messages.companies.no_permissions'), t('messages.companies.no_modify_permissions'));  
      } else {
        showError(t('messages.error'), errorMessage);
      }
    },
  });
};

// Hook para actualización de estado de empresa
export const useCompanyStatusACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

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
        t('messages.companies.status_updated'),
        t('messages.companies.status_updated_desc', { status: params.newStatus })
      );
    },
    onError: (error: Error) => {
      console.error('❌ useCompanyStatusACID - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos para cambiar el estado')) {
        showError(t('messages.companies.no_permissions'), t('messages.companies.no_modify_permissions'));
      } else if (errorMessage.includes('Empresa no encontrada')) {
        showError(t('messages.companies.not_found'), t('messages.companies.company_not_found'));
      } else if (errorMessage.includes('Estado no válido')) {
        showError(t('messages.companies.invalid_status'), t('messages.companies.status_invalid'));
      } else if (errorMessage.includes('ya está en estado')) {
        showError('Sin cambios', 'La empresa ya está en ese estado.');
      } else {
        showError('Error actualizando estado', errorMessage);
      }
    },
  });
};