import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';
import { useCompanyCache } from './useCompanyCache';

interface CleanupPeriodParams {
  weekNumber?: number;
  yearNumber?: number;
}

export const useCleanupPeriod = () => {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('payments');

  return useMutation({
    mutationFn: async ({ weekNumber = 35, yearNumber = 2025 }: CleanupPeriodParams = {}): Promise<any> => {
      console.log('🧹 useCleanupPeriod - Iniciando limpieza de período:', { weekNumber, yearNumber, companyId: userCompany?.company_id });
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      if (!userCompany?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Ejecutar función de limpieza
      const { data: result, error } = await supabase.rpc(
        'cleanup_period_and_orphaned_data',
        {
          target_company_id: userCompany.company_id,
          week_number: weekNumber,
          year_number: yearNumber
        }
      );

      if (error) {
        console.error('❌ useCleanupPeriod - Error ejecutando función:', error);
        throw new Error(error.message);
      }

      if (!result || typeof result !== 'object' || !(result as any)?.success) {
        console.error('❌ useCleanupPeriod - Función no exitosa:', result);
        throw new Error((result as any)?.message || 'La operación de limpieza no fue exitosa');
      }

      console.log('✅ useCleanupPeriod - Limpieza completada:', result);
      return result;
    },
    onSuccess: (result: any) => {
      console.log('✅ useCleanupPeriod - Éxito en limpieza:', result);
      
      // Invalidar todas las queries relacionadas con períodos y deducciones
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      
      // Mostrar resumen de la limpieza
      const { deleted_calculations, deleted_expenses, deleted_periods, week_number } = result;
      const summary = `Semana ${week_number} limpiada: ${deleted_periods} períodos, ${deleted_calculations} cálculos, ${deleted_expenses} deducciones eliminadas`;
      
      showSuccess('Limpieza completada exitosamente', summary);
    },
    onError: (error: Error) => {
      console.error('❌ useCleanupPeriod - Error:', error);
      showError('Error en limpieza de período', error.message);
    },
  });
};