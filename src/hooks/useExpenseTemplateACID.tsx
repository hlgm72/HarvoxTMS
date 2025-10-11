import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

interface ExpenseTemplateData {
  [key: string]: any;
  user_id: string;
  expense_type_id: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date?: string;
  month_week?: number;
  notes?: string;
  applied_to_role?: string;
  is_active?: boolean;
  change_reason?: string;
}

interface CreateOrUpdateExpenseTemplateParams {
  templateData: ExpenseTemplateData;
  templateId?: string;
}

interface ExpenseTemplateResponse {
  success: boolean;
  operation: 'CREATE' | 'UPDATE';
  message: string;
  template: any;
  created_by: string;
  processed_at: string;
}

export const useExpenseTemplateACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation<ExpenseTemplateResponse, Error, CreateOrUpdateExpenseTemplateParams>({
    mutationFn: async (params: CreateOrUpdateExpenseTemplateParams): Promise<ExpenseTemplateResponse> => {
      console.log('🔄 useExpenseTemplateACID - Procesando plantilla:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_or_update_expense_template_with_validation', {
        template_data: params.templateData,
        template_id: params.templateId || null
      });

      if (error) {
        console.error('❌ useExpenseTemplateACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useExpenseTemplateACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error procesando plantilla de deducción');
      }

      console.log('✅ useExpenseTemplateACID - Plantilla procesada exitosamente:', data);
      return data as any as ExpenseTemplateResponse;
    },
    onSuccess: (data, params) => {
      console.log(`✅ useExpenseTemplateACID - ${data.operation} completado exitosamente`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['expense-recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['expense-template-history'] });
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      
      // Mostrar mensaje de éxito específico
      const isCreate = data.operation === 'CREATE';
      showSuccess(
        isCreate ? 'Plantilla creada' : 'Plantilla actualizada',
        `La plantilla de deducción se ${isCreate ? 'creó' : 'actualizó'} exitosamente y se aplicará automáticamente a los próximos períodos.`
      );
    },
    onError: (error: Error) => {
      console.error('❌ useExpenseTemplateACID - Error:', error);
      
      // Proporcionar mensajes de error específicos
      let errorMessage = error.message;
      if (errorMessage.includes('user_id es requerido')) {
        showError('Datos incompletos', 'Debe especificar el conductor para la deducción.');
      } else if (errorMessage.includes('expense_type_id es requerido')) {
        showError(t('messages.templates.incomplete_data'), t('messages.templates.type_required'));
      } else if (errorMessage.includes('amount es requerido')) {
        showError(t('messages.templates.incomplete_data'), t('messages.templates.amount_required'));
      } else if (errorMessage.includes('Sin permisos')) {
        showError(t('messages.templates.no_permissions'), t('messages.templates.no_manage_permissions'));
      } else if (errorMessage.includes('Plantilla no encontrada')) {
        showError(t('messages.templates.not_found'), t('messages.templates.template_not_found'));
      } else {
        showError(t('messages.error'), errorMessage);
      }
    },
  });
};

// Hook para desactivar plantillas
export const useDeactivateExpenseTemplate = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation<any, Error, { templateId: string; reason?: string }>({
    mutationFn: async (params: { templateId: string; reason?: string }) => {
      console.log('🔄 useDeactivateExpenseTemplate - Desactivando plantilla:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('deactivate_expense_template_with_validation', {
        template_id: params.templateId,
        deactivation_reason: params.reason || null
      });

      if (error) {
        console.error('❌ useDeactivateExpenseTemplate - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useDeactivateExpenseTemplate - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error desactivando plantilla');
      }

      console.log('✅ useDeactivateExpenseTemplate - Plantilla desactivada exitosamente:', data);
      return data;
    },
    onSuccess: (data, params) => {
      console.log('✅ useDeactivateExpenseTemplate - Desactivación completada:', params.templateId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['expense-recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['expense-template-history'] });
      
      showSuccess(
        t('messages.templates.deactivated'),
        t('messages.templates.deactivated_desc')
      );
    },
    onError: (error: Error) => {
      console.error('❌ useDeactivateExpenseTemplate - Error:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos')) {
        showError('Sin permisos', 'No tienes autorización para desactivar esta plantilla.');
      } else if (errorMessage.includes('Plantilla no encontrada')) {
        showError('Plantilla no encontrada', 'La plantilla que intentas desactivar no existe.');
      } else if (errorMessage.includes('ya está desactivada')) {
        showError('Ya desactivada', 'La plantilla ya está desactivada.');
      } else {
        showError('Error desactivando plantilla', errorMessage);
      }
    },
  });
};