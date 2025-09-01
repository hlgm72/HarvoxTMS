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
      
      // Primero obtener el company_id del período para verificar integridad
      const { data: periodData, error: periodError } = await supabase
        .from('company_payment_periods')
        .select('company_id')
        .eq('id', periodId)
        .single();

      if (periodError) throw periodError;

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
      
      // Obtener todos los cálculos de conductores para este período (ya actualizados)
      const { data: driverCalculations, error } = await supabase
        .from('driver_period_calculations')
        .select('*')
        .eq('company_payment_period_id', periodId);

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
      
      // Obtener todos los períodos de la empresa
      const { data: periods, error: periodsError } = await supabase
        .from('company_payment_periods')
        .select('id')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (periodsError) throw periodsError;

      if (!periods || periods.length === 0) {
        return [];
      }

      // Obtener los cálculos para todos los períodos (ya actualizados)
      const { data: allCalculations, error: calcError } = await supabase
        .from('driver_period_calculations')
        .select('*')
        .in('company_payment_period_id', periods.map(p => p.id));

      if (calcError) throw calcError;

      // Agrupar por período y calcular totales
      const summaryMap = new Map<string, PaymentPeriodSummary>();

      periods.forEach(period => {
        summaryMap.set(period.id, {
          period_id: period.id,
          gross_earnings: 0,
          other_income: 0,
          fuel_expenses: 0,
          deductions: 0,
          net_payment: 0,
          driver_count: 0,
          drivers_with_negative_balance: 0,
        });
      });

    allCalculations?.forEach(calc => {
        const summary = summaryMap.get(calc.company_payment_period_id);
        if (summary) {
          summary.gross_earnings += calc.gross_earnings || 0;
          summary.other_income += calc.other_income || 0;
          summary.fuel_expenses += calc.fuel_expenses || 0;
          summary.deductions += calc.total_deductions || 0;
          summary.net_payment += calculateNetPayment(calc);
          summary.driver_count++;
          
          if (calc.has_negative_balance) {
            summary.drivers_with_negative_balance++;
          }
        }
      });

      return Array.from(summaryMap.values());
    },
    enabled: !!companyId,
  });
}