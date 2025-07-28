import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateNetPayment } from "@/lib/paymentCalculations";

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
      
      // Obtener todos los cálculos de conductores para este período
      const { data: driverCalculations, error } = await supabase
        .from('driver_period_calculations')
        .select('*')
        .eq('company_payment_period_id', periodId);

      console.log('🔍 usePaymentPeriodSummary query para período:', periodId);
      console.log('🔍 Datos obtenidos de driver_period_calculations:', driverCalculations);
      console.log('🔍 Error (si existe):', error);

      if (error) throw error;

      if (!driverCalculations || driverCalculations.length === 0) {
        console.log('⚠️ No se encontraron cálculos para el período:', periodId);
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

      console.log('✅ Encontrados', driverCalculations.length, 'cálculos para procesar');

      // Calcular totales
      const summary = driverCalculations.reduce((acc, calc) => {
        acc.gross_earnings += calc.gross_earnings || 0;
        acc.other_income += calc.other_income || 0;
        acc.fuel_expenses += calc.fuel_expenses || 0;
        acc.deductions += calc.total_deductions || 0;
        acc.net_payment += calculateNetPayment(calc);
        
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

      // Obtener los cálculos para todos los períodos
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