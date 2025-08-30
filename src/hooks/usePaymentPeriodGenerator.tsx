import { supabase } from '@/integrations/supabase/client';

export interface PaymentPeriodGeneratorParams {
  companyId: string;
  userId: string;
  targetDate: string; // ISO date string (YYYY-MM-DD)
}

/**
 * ========================================
 * SISTEMA DE PERÍODOS BAJO DEMANDA v2.0
 * ========================================
 * 
 * FILOSOFÍA: Los períodos de pago solo se crean cuando son realmente necesarios:
 * - Al crear una nueva carga
 * - Al agregar gastos de combustible 
 * - Al crear deducciones/otros ingresos
 * - Nunca se generan períodos futuros innecesarios
 * 
 * NUEVA IMPLEMENTACIÓN: Usa la función SQL create_payment_period_if_needed
 * que es más eficiente y maneja mejor la concurrencia.
 */
export const usePaymentPeriodGenerator = () => {
  
  const ensurePaymentPeriodExists = async ({
    companyId,
    userId,
    targetDate
  }: PaymentPeriodGeneratorParams): Promise<string | null> => {
    try {
      console.log('🔍 ensurePaymentPeriodExists v2.0 - Using on-demand generation for:', { companyId, userId, targetDate });

      // ✅ NUEVA IMPLEMENTACIÓN: Usar la función SQL optimizada
      const { data: periodId, error } = await supabase.rpc('create_payment_period_if_needed', {
        target_company_id: companyId,
        target_date: targetDate,
        created_by_user_id: userId
      });

      if (error) {
        console.error('❌ Error in create_payment_period_if_needed:', error);
        throw error;
      }

      if (!periodId) {
        console.log('❌ No period created - likely too far in future or other restriction');
        return null;
      }

      console.log('✅ Period ensured (existing or created):', periodId);
      return periodId;

    } catch (error) {
      console.error('❌ ensurePaymentPeriodExists v2.0 - Unexpected error:', error);
      return null;
    }
  };

  return { ensurePaymentPeriodExists };
};