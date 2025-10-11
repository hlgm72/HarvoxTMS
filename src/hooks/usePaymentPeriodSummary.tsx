import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateNetPayment } from "@/lib/paymentCalculations";

// ===============================================
// 🚨 HOOK DE RESÚMENES DE PERÍODOS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
// 
// Este hook maneja recálculos automáticos críticos usando
// verify_and_recalculate_company_payments. Cualquier error
// puede causar inconsistencias en reportes financieros.
// 
// Ver: docs/CRITICAL-BUSINESS-LOGIC-PROTECTION.md

export interface PaymentPeriodSummary {
  period_id: string;
  gross_earnings: number;
  other_income: number;
  fuel_expenses: number;
  deductions: number;
  net_payment: number;
  driver_count: number;
  drivers_with_negative_balance: number;
}

export function usePaymentPeriodSummary(periodId?: string) {
  return useQuery({
    queryKey: ['payment-period-summary', periodId],
    queryFn: async (): Promise<PaymentPeriodSummary | null> => {
      if (!periodId) throw new Error('Period ID is required');
      
      // ✅ Detectar períodos calculados y evitar queries inválidas
      if (periodId.startsWith('calculated-')) {
        console.log('🔍 Período calculado detectado en usePaymentPeriodSummary:', periodId, '- retornando resumen vacío');
        return {
          period_id: periodId,
          gross_earnings: 0,
          other_income: 0,
          fuel_expenses: 0,
          deductions: 0,
          net_payment: 0,
          driver_count: 0,
          drivers_with_negative_balance: 0,
        };
      }
      
      // Get company_id directly from the period
      const { data: periodData, error: periodError } = await supabase
        .from('user_payment_periods')
        .select('company_id')
        .eq('id', periodId)
        .maybeSingle();

      if (periodError) throw periodError;
      if (!periodData) return {
        period_id: periodId,
        gross_earnings: 0,
        other_income: 0,
        fuel_expenses: 0,
        deductions: 0,
        net_payment: 0,
        driver_count: 0,
        drivers_with_negative_balance: 0,
      };

      // 🚨 RECÁLCULO CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN
      // FORZAR recálculo completo para asegurar datos correctos después del revert
      console.log('🔄 Forzando recálculo completo de la empresa:', periodData.company_id);
      const { data: integrityResult, error: integrityError } = await supabase
        .rpc('verify_and_recalculate_company_payments', {
          target_company_id: periodData.company_id
        });

      if (integrityError) {
        console.error('❌ Error en recálculo automático:', integrityError);
        // Continuar con los datos disponibles aunque haya error en la verificación
      } else {
        console.log('✅ Recálculo completado:', integrityResult);
      }
      
      // Obtener todos los user_payment_periods para todos los usuarios de esta empresa
      const { data: allUserPeriods, error } = await supabase
        .from('user_payment_periods')
        .select('id, period_start_date, period_end_date, company_id, status, user_id')
        .eq('company_id', periodData.company_id);

      if (error) throw error;
      if (!allUserPeriods || allUserPeriods.length === 0) return {
        period_id: periodId,
        gross_earnings: 0,
        other_income: 0,
        fuel_expenses: 0,
        deductions: 0,
        net_payment: 0,
        driver_count: 0,
        drivers_with_negative_balance: 0,
      };

      // Para calcular el summary, sumamos todos los user_payment_periods que coincidan con las fechas del período actual
      const periodStart = await supabase
        .from('user_payment_periods')
        .select('period_start_date, period_end_date')
        .eq('id', periodId)
        .maybeSingle();

      const relevantPeriods = allUserPeriods.filter(p => 
        p.period_start_date === periodStart.data?.period_start_date &&
        p.period_end_date === periodStart.data?.period_end_date
      );

      // Obtener todos los cálculos de conductores para estos períodos
      const { data: driverCalculations, error: calcError } = await supabase
        .from('user_payment_periods')
        .select('*')
        .in('id', relevantPeriods.map(p => p.id));

      if (error) throw error;

      if (!driverCalculations || driverCalculations.length === 0) {
        return {
          period_id: periodId,
          gross_earnings: 0,
          other_income: 0,
          fuel_expenses: 0,
          deductions: 0,
          net_payment: 0,
          driver_count: 0,
          drivers_with_negative_balance: 0,
        };
      }

      // 🚨 CRÍTICO - Cálculo de totales financieros - NO MODIFICAR
      // Calcular totales
      const summary = driverCalculations.reduce((acc, calc) => {
        acc.gross_earnings += calc.gross_earnings || 0;
        acc.other_income += calc.other_income || 0;
        acc.fuel_expenses += calc.fuel_expenses || 0;
        acc.deductions += calc.total_deductions || 0;
        acc.net_payment += calculateNetPayment(calc); // 🚨 FUNCIÓN CRÍTICA
        
        if (calc.has_negative_balance) {
          acc.drivers_with_negative_balance++;
        }
        
        return acc;
      }, {
        gross_earnings: 0,
        other_income: 0,
        fuel_expenses: 0,
        deductions: 0,
        net_payment: 0,
        drivers_with_negative_balance: 0,
      });

      return {
        period_id: periodId,
        ...summary,
        driver_count: driverCalculations.length,
      };
    },
    enabled: !!periodId,
  });
}

export function useAllPaymentPeriodsSummary(companyId?: string) {
  return useQuery({
    queryKey: ['all-payment-periods-summary', companyId],
    queryFn: async (): Promise<PaymentPeriodSummary[]> => {
      if (!companyId) throw new Error('Company ID is required');
      
      // 🚨 RECÁLCULO AUTOMÁTICO CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN
      // Verificar y recalcular automáticamente la integridad de todos los cálculos de la empresa
      const { data: integrityResult, error: integrityError } = await supabase
        .rpc('verify_and_recalculate_company_payments', {
          target_company_id: companyId
        });

      if (integrityError) {
        console.warn('Error verificando integridad de cálculos:', integrityError);
        // Continuar con los datos disponibles aunque haya error en la verificación
      }
      
      // Obtener todos los cálculos de la empresa
      const { data: allCalculations, error: calcError } = await supabase
        .from('user_payment_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (calcError) throw calcError;

      if (!allCalculations || allCalculations.length === 0) {
        return [];
      }

      // Agrupar por período (start + end date) y calcular totales
      const summaryMap = new Map<string, PaymentPeriodSummary>();

      allCalculations.forEach(calc => {
        const periodKey = `${calc.period_start_date}-${calc.period_end_date}`;
        
        if (!summaryMap.has(periodKey)) {
          summaryMap.set(periodKey, {
            period_id: calc.id, // Use first calculation's ID as representative
            gross_earnings: 0,
            other_income: 0,
            fuel_expenses: 0,
            deductions: 0,
            net_payment: 0,
            driver_count: 0,
            drivers_with_negative_balance: 0,
          });
        }

        const summary = summaryMap.get(periodKey)!;
        summary.gross_earnings += calc.gross_earnings || 0;
        summary.other_income += calc.other_income || 0;
        summary.fuel_expenses += calc.fuel_expenses || 0;
        summary.deductions += calc.total_deductions || 0;
        summary.net_payment += calculateNetPayment(calc);
        summary.driver_count++;
        
        if (calc.has_negative_balance) {
          summary.drivers_with_negative_balance++;
        }
      });

      return Array.from(summaryMap.values());
    },
    enabled: !!companyId,
  });
}