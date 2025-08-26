import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

interface UserData {
  [key: string]: any;
  user_id: string;
  driver_id?: string;
  license_number?: string;
  license_state?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  cdl_class?: string;
  cdl_endorsements?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active?: boolean;
  operator_type?: string;
  contract_start_date?: string;
}

interface RoleData {
  [key: string]: any;
  company_id: string;
  role: 'superadmin' | 'company_owner' | 'operations_manager' | 'senior_dispatcher' | 'dispatcher' | 'driver';
}

interface CreateOrUpdateUserParams {
  userData: UserData;
  roleData?: RoleData;
}

interface UserResponse {
  success: boolean;
  operation: 'CREATE' | 'UPDATE';
  message: string;
  user_profile: any;
  company_role?: any;
  owner_operator_created: boolean;
  processed_by: string;
  processed_at: string;
}

export const useUserManagementACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation<UserResponse, Error, CreateOrUpdateUserParams>({
    mutationFn: async (params: CreateOrUpdateUserParams): Promise<UserResponse> => {
      console.log('🔄 useUserManagementACID - Procesando usuario:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_or_update_user_profile_with_validation', {
        user_data: params.userData,
        role_data: params.roleData || null
      });

      if (error) {
        console.error('❌ useUserManagementACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useUserManagementACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error procesando usuario');
      }

      console.log('✅ useUserManagementACID - Usuario procesado exitosamente:', data);
      return data as any as UserResponse;
    },
    onSuccess: (data, params) => {
      console.log(`✅ useUserManagementACID - ${data.operation} completado exitosamente`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers-count'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] });
      
      // Mostrar mensaje de éxito específico
      const isCreate = data.operation === 'CREATE';
      showSuccess(
        isCreate ? 'Usuario creado' : 'Usuario actualizado',
        `El usuario se ${isCreate ? 'creó' : 'actualizó'} exitosamente con validaciones ACID${data.company_role ? ' y rol asignado' : ''}.`
      );
    },
    onError: (error: Error) => {
      console.error('❌ useUserManagementACID - Error:', error);
      
      // Proporcionar mensajes de error específicos
      let errorMessage = error.message;
      if (errorMessage.includes('user_id es requerido')) {
        showError(t('messages.users.incomplete_data'), t('messages.users.user_id_required'));
      } else if (errorMessage.includes('company_id es requerido')) {
        showError(t('messages.users.incomplete_data'), t('messages.users.company_required'));
      } else if (errorMessage.includes('Sin permisos para gestionar usuarios')) {
        showError(t('messages.users.no_permissions'), t('messages.users.no_manage_permissions'));
      } else if (errorMessage.includes('no existe en el sistema de autenticación')) {
        showError(t('messages.users.invalid_user'), t('messages.users.user_not_found'));
      } else {
        showError(t('messages.error'), errorMessage);
      }
    },
  });
};

// Hook para actualización de roles
export const useUserRoleACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation<any, Error, { userId: string; companyId: string; role: 'superadmin' | 'company_owner' | 'operations_manager' | 'senior_dispatcher' | 'dispatcher' | 'driver'; isActive?: boolean }>({
    mutationFn: async (params) => {
      console.log('🔄 useUserRoleACID - Actualizando rol:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('update_user_role_with_validation', {
        target_user_id: params.userId,
        target_company_id: params.companyId,
        new_role: params.role,
        status_active: params.isActive ?? true
      });

      if (error) {
        console.error('❌ useUserRoleACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useUserRoleACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error actualizando rol');
      }

      console.log('✅ useUserRoleACID - Rol actualizado exitosamente:', data);
      return data;
    },
    onSuccess: (data, params) => {
      console.log('✅ useUserRoleACID - Actualización completada:', params.userId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      showSuccess(
        t('messages.users.role_updated'),
        t('messages.users.role_updated_desc')
      );
    },
    onError: (error: Error) => {
      console.error('❌ useUserRoleACID - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos para gestionar roles')) {
        showError(t('messages.users.no_permissions'), t('messages.users.no_role_permissions'));
      } else if (errorMessage.includes('no existe')) {
        showError(t('messages.users.not_found'), t('messages.users.user_not_exists'));
      } else if (errorMessage.includes('No puedes modificar tu propio rol')) {
        showError(t('messages.users.cannot_modify_own_role'), t('messages.users.cannot_modify_own_role_desc'));
      } else {
        showError(t('messages.error'), errorMessage);
      }
    },
  });
};

// Hook para desactivación de usuarios
export const useUserDeactivationACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation<any, Error, { userId: string; companyId: string; reason?: string }>({
    mutationFn: async (params) => {
      console.log('🔄 useUserDeactivationACID - Desactivando usuario:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('deactivate_user_with_validation', {
        target_user_id: params.userId,
        target_company_id: params.companyId,
        deactivation_reason: params.reason || null
      });

      if (error) {
        console.error('❌ useUserDeactivationACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useUserDeactivationACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error desactivando usuario');
      }

      console.log('✅ useUserDeactivationACID - Usuario desactivado exitosamente:', data);
      return data;
    },
    onSuccess: (data, params) => {
      console.log('✅ useUserDeactivationACID - Desactivación completada:', params.userId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers-count'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      showSuccess(
        t('messages.users.deactivated'),
        t('messages.users.deactivated_desc')
      );
    },
    onError: (error: Error) => {
      console.error('❌ useUserDeactivationACID - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos para desactivar')) {
        showError('Sin permisos', 'No tienes autorización para desactivar usuarios en esta empresa.');
      } else if (errorMessage.includes('No puedes desactivar tu propia cuenta')) {
        showError(t('messages.users.cannot_modify_own_role'), t('messages.users.cannot_deactivate_self'));
      } else {
        showError(t('messages.error'), errorMessage);
      }
    },
  });
};