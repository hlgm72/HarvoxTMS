import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { calculateNetPayment } from "@/lib/paymentCalculations";

export interface DriverCalculation {
  id: string;
  driver_user_id: string;
  gross_earnings: number;
  fuel_expenses: number;
  total_deductions: number;
  other_income: number;
  payment_status: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
}

export function useDriverPaymentActions() {
  const { showSuccess, showError } = useFleetNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const markDriverAsPaid = async (
    calculationId: string,
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('mark_driver_as_paid', {
        calculation_id: calculationId,
        payment_method_used: paymentMethod,
        payment_ref: paymentReference || null,
        notes: notes || null
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showSuccess("Pago Registrado", result.message || "Conductor marcado como pagado");
        return { success: true, data };
      } else {
        showError(result?.message || "No se pudo registrar el pago");
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error marking driver as paid:', error);
      showError(error.message || "Error al registrar el pago");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDriverPeriod = async (calculationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_driver_payment_period', {
        driver_calculation_id: calculationId
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string; gross_earnings?: number; other_income?: number; fuel_expenses?: number; total_deductions?: number };
      if (result?.success) {
        const netPayment = calculateNetPayment(result as any);
        showSuccess(
          "Cálculo Completado", 
          `Período calculado exitosamente. Pago neto: $${netPayment.toLocaleString('es-US', { minimumFractionDigits: 2 })}`
        );
        return { success: true, data };
      } else {
        showError(result?.message || "No se pudo calcular el período");
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error calculating driver period:', error);
      showError(error.message || "Error al calcular el período");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const markMultipleDriversAsPaid = async (
    calculations: DriverCalculation[],
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    setIsLoading(true);
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const calc of calculations) {
        if (calc.payment_status === 'paid') continue;

        const result = await markDriverAsPaid(
          calc.id,
          paymentMethod,
          paymentReference,
          notes
        );

        results.push({ calculationId: calc.id, ...result });
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(
          "Pagos Procesados", 
          `${successCount} conductor(es) marcado(s) como pagado(s)${errorCount > 0 ? `, ${errorCount} falló(s)` : ''}`
        );
      }

      return { 
        success: successCount > 0, 
        successCount, 
        errorCount, 
        results 
      };
    } catch (error: any) {
      console.error('Error in bulk payment:', error);
      showError("Error en pago masivo");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const checkPeriodClosureStatus = async (periodId: string) => {
    try {
      const { data, error } = await supabase.rpc('can_close_payment_period', {
        period_id: periodId
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error checking period closure status:', error);
      return { success: false, error: error.message };
    }
  };

  const closePeriodWhenComplete = async (periodId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('close_payment_period_when_complete', {
        period_id: periodId
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showSuccess("Período Cerrado", result.message || "Período cerrado exitosamente");
        return { success: true, data };
      } else {
        showError(result?.message || "No se pudo cerrar el período");
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error closing period:', error);
      showError(error.message || "Error al cerrar el período");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    markDriverAsPaid,
    calculateDriverPeriod,
    markMultipleDriversAsPaid,
    checkPeriodClosureStatus,
    closePeriodWhenComplete,
    isLoading
  };
}