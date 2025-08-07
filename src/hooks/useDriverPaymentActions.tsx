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
      // ✅ USE ENHANCED ACID FUNCTION
      const { data, error } = await supabase.rpc('mark_driver_as_paid_with_validation', {
        calculation_id: calculationId,
        payment_method_used: paymentMethod,
        payment_ref: paymentReference || null,
        notes: notes || null
      });

      if (error) {
        console.error('❌ Error marking driver as paid with ACID:', error);
        
        // Provide specific error messages
        let errorMessage = error.message;
        if (errorMessage.includes('Sin permisos')) {
          showError('Sin permisos', 'No tienes autorización para marcar este conductor como pagado.');
        } else if (errorMessage.includes('Período bloqueado')) {
          showError('Período bloqueado', 'No se pueden procesar pagos en un período bloqueado.');
        } else if (errorMessage.includes('ya está marcado como pagado')) {
          showError('Ya pagado', 'El conductor ya está marcado como pagado.');
        } else if (errorMessage.includes('no permite el pago')) {
          showError('Estado no válido', 'El estado del cálculo no permite el pago en este momento.');
        } else {
          showError('Error en pago', errorMessage);
        }
        return { success: false, error: errorMessage };
      }

      const result = data as any;
      if (result?.success) {
        showSuccess(
          "Pago ACID Registrado", 
          `Conductor marcado como pagado con validaciones ACID. Monto: $${result.net_payment?.toLocaleString('es-US', { minimumFractionDigits: 2 }) || '0.00'}`
        );
        return { success: true, data };
      } else {
        showError(result?.message || "No se pudo registrar el pago ACID");
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('❌ Error in markDriverAsPaid ACID:', error);
      showError(error.message || "Error al registrar el pago ACID");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDriverPeriod = async (calculationId: string) => {
    setIsLoading(true);
    try {
      // ✅ USE ACID FUNCTION FOR ATOMIC CALCULATION
      const { data, error } = await supabase.rpc('calculate_driver_payment_period_with_validation', {
        period_calculation_id: calculationId
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        showSuccess(
          "Cálculo ACID Completado", 
          `Período calculado con garantías ACID. Pago neto: $${result.net_payment?.toLocaleString('es-US', { minimumFractionDigits: 2 }) || '0.00'}`
        );
        return { success: true, data };
      } else {
        showError(result?.message || "No se pudo calcular el período con ACID");
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error calculating driver period with ACID:', error);
      showError(error.message || "Error al calcular el período con ACID");
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
    try {
      // Extract calculation IDs for ACID bulk operation
      const calculationIds = calculations
        .filter(calc => calc.payment_status !== 'paid')
        .map(calc => calc.id);

      if (calculationIds.length === 0) {
        showError("No hay conductores pendientes de pago");
        return { success: false, error: "No pending drivers" };
      }

      // ✅ USE ACID FUNCTION FOR ATOMIC BULK PAYMENT
      const { data, error } = await supabase.rpc('mark_multiple_drivers_as_paid_with_validation', {
        calculation_ids: calculationIds,
        payment_method_used: paymentMethod,
        payment_ref: paymentReference || null,
        notes: notes || null
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        showSuccess(
          "Pagos Masivos ACID Procesados", 
          result.message || `${result.success_count} conductor(es) marcado(s) como pagado(s)`
        );
        return { 
          success: true, 
          successCount: result.success_count,
          errorCount: result.error_count,
          results: result.detailed_results 
        };
      } else {
        showError(result?.message || "Error en pago masivo ACID");
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error in ACID bulk payment:', error);
      showError("Error en pago masivo ACID");
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