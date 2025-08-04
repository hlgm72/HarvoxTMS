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

      // Obtener configuración de la empresa para determinar el rango
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('default_payment_frequency')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('❌ Error getting company data:', companyError);
        throw companyError;
      }

      // Determinar rango basado en frecuencia de pago - incluir período anterior, actual y siguiente
      let rangeDays = 7; // default para weekly
      switch (companyData.default_payment_frequency) {
        case 'weekly':
          rangeDays = 21; // ±3 semanas (anterior, actual, siguiente)
          break;
        case 'biweekly':
          rangeDays = 42; // ±6 semanas (anterior, actual, siguiente)
          break;
        case 'monthly':
          rangeDays = 90; // ±3 meses (anterior, actual, siguiente)
          break;
        default:
          rangeDays = 21;
      }

      console.log(`📅 Using range of ±${rangeDays} days for ${companyData.default_payment_frequency} frequency to include previous, current, and next periods`);

      // Generar períodos en el rango ampliado para incluir período anterior
      const fromDate = formatDateInUserTimeZone(new Date(Date.parse(targetDate) - rangeDays * 24 * 60 * 60 * 1000));
      const toDate = formatDateInUserTimeZone(new Date(Date.parse(targetDate) + rangeDays * 24 * 60 * 60 * 1000));

      const { data: generateResult, error: generateError } = await supabase.rpc(
        'generate_company_payment_periods',
        {
          company_id_param: companyId,
          from_date: fromDate,
          to_date: toDate
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