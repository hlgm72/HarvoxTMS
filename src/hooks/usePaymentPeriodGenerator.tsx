import { supabase } from '@/integrations/supabase/client';
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';

export interface PaymentPeriodGeneratorParams {
  companyId: string;
  userId: string;
  targetDate: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Helper para auto-generar períodos de pago cuando no existen
 * Se usa para otros ingresos, deducciones recurrentes y gastos de combustible
 */
export const usePaymentPeriodGenerator = () => {
  
  const ensurePaymentPeriodExists = async ({
    companyId,
    userId,
    targetDate
  }: PaymentPeriodGeneratorParams): Promise<string | null> => {
    try {
      console.log('🔍 ensurePaymentPeriodExists - Starting for:', { companyId, userId, targetDate });

      // Buscar período existente
      const { data: existingPeriod, error: periodError } = await supabase
        .from('company_payment_periods')
        .select('id')
        .eq('company_id', companyId)
        .lte('period_start_date', targetDate)
        .gte('period_end_date', targetDate)
        .in('status', ['open', 'processing'])
        .limit(1)
        .single();

      if (periodError && periodError.code !== 'PGRST116') {
        console.error('❌ Error finding existing period:', periodError);
        throw periodError;
      }

      // Si encontramos período existente, lo devolvemos
      if (existingPeriod?.id) {
        console.log('✅ Found existing period:', existingPeriod.id);
        return existingPeriod.id;
      }

      console.log('📅 No existing period found, generating new ones...');

      // Obtener configuración de la empresa para determinar el rango usando RPC seguro
      const { data: companyData, error: companyError } = await supabase
        .rpc('get_companies_basic_info', {
          target_company_id: companyId
        })
        .then(result => ({
          data: result.data?.[0] || null,
          error: result.error
        }));

      if (companyError) {
        console.error('❌ Error getting company data:', companyError);
        throw companyError;
      }

      // Solo generar el período específico que contiene la fecha objetivo
      const frequency = (companyData as any)?.default_payment_frequency || 'weekly';
      console.log(`📅 Generando solo el período específico para ${targetDate} con frecuencia ${frequency}`);

      // Generar solo el período que contiene la fecha objetivo
      const fromDate = targetDate;
      const toDate = targetDate;

      const { data: generateResult, error: generateError } = await supabase.rpc(
        'generate_company_payment_periods_with_calculations',
        {
          target_company_id: companyId,
          start_date: fromDate,
          end_date: toDate,
          run_calculations: true
        }
      );

      if (generateError) {
        console.error('❌ Error generating periods:', generateError);
        throw generateError;
      }

      console.log('✅ Generated periods result:', generateResult);

      // Buscar el período generado para la fecha objetivo
      const { data: newPeriod, error: newPeriodError } = await supabase
        .from('company_payment_periods')
        .select('id')
        .eq('company_id', companyId)
        .lte('period_start_date', targetDate)
        .gte('period_end_date', targetDate)
        .in('status', ['open', 'processing'])
        .limit(1)
        .single();

      if (newPeriodError) {
        console.error('❌ Still no period found after generation:', newPeriodError);
        return null;
      }

      console.log('✅ Found generated period:', newPeriod.id);
      return newPeriod.id;

    } catch (error) {
      console.error('❌ ensurePaymentPeriodExists - Unexpected error:', error);
      return null;
    }
  };

  return { ensurePaymentPeriodExists };
};