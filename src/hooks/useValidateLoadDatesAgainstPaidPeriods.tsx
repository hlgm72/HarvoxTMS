import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { formatPeriodLabel } from "@/utils/periodUtils";

interface ValidationResult {
  isValid: boolean;
  error: string | null;
  paidPeriod?: {
    period_start_date: string;
    period_end_date: string;
  };
}

/**
 * Hook para validar si las fechas de una carga caen en períodos de pago ya marcados como pagados
 */
export function useValidateLoadDatesAgainstPaidPeriods() {
  const { t } = useTranslation('loads');
  const [isValidating, setIsValidating] = useState(false);
  const { selectedCompany } = useUserCompanies();

  const validateDates = async (
    driverId: string | null,
    dates: string[]
  ): Promise<ValidationResult> => {
    // Si no hay conductor, permitir la creación (será asignado después)
    if (!driverId) {
      return { isValid: true, error: null };
    }

    // Si no hay fechas, permitir (aunque esto debería fallar en otra validación)
    if (!dates || dates.length === 0) {
      return { isValid: true, error: null };
    }

    // Si no hay compañía seleccionada
    if (!selectedCompany?.id) {
      return { isValid: true, error: null };
    }

    setIsValidating(true);

    try {
      // Verificar cada fecha
      for (const date of dates) {
        // Buscar si existe un período de pago para esta fecha y conductor
        const { data: periods, error: periodsError } = await supabase
          .from('company_payment_periods')
          .select(`
            id,
            period_start_date,
            period_end_date,
            user_payrolls!company_payment_period_id(
              user_id,
              payment_status
            )
          `)
          .eq('company_id', selectedCompany.id)
          .lte('period_start_date', date)
          .gte('period_end_date', date)
          .limit(1);

        if (periodsError) {
          console.error('❌ Error checking payment periods:', periodsError);
          continue; // En caso de error, continuar con las demás fechas
        }

        // Si encontramos un período, verificar si el conductor está pagado
        if (periods && periods.length > 0) {
          const period = periods[0];
          
          // Buscar el payroll del conductor en este período
          const driverPayroll = (period.user_payrolls as any[]).find(
            (payroll: any) => payroll.user_id === driverId
          );

          // Si el conductor tiene un payroll pagado en este período, bloquear
          if (driverPayroll && driverPayroll.payment_status === 'paid') {
            setIsValidating(false);
            const periodLabel = formatPeriodLabel(period.period_start_date, period.period_end_date);
            return {
              isValid: false,
              error: t('validation.paid_period_error', {
                date,
                periodLabel,
                startDate: period.period_start_date,
                endDate: period.period_end_date
              }),
              paidPeriod: {
                period_start_date: period.period_start_date,
                period_end_date: period.period_end_date,
              },
            };
          }
        }
      }

      setIsValidating(false);
      return { isValid: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error validating dates:', error);
      setIsValidating(false);
      // En caso de error inesperado, permitir la creación pero logear el error
      return { isValid: true, error: null };
    }
  };

  return {
    validateDates,
    isValidating,
  };
}
