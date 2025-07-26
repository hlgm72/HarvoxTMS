import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface PaymentPeriodStatus {
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

/**
 * Hook para manejar la protección de períodos de pago bloqueados
 * Proporciona funciones para verificar estado, bloquear períodos y manejar errores RLS
 */
export const usePaymentPeriodProtection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();

  /**
   * Verifica el estado de bloqueo de un período de pago
   */
  const checkPeriodStatus = useCallback(async (periodId: string): Promise<PaymentPeriodStatus | null> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('is_locked, locked_at, locked_by')
        .eq('id', periodId)
        .single();

      if (error) {
        console.error('Error checking period status:', error);
        showError("No se pudo verificar el estado del período de pago");
        return null;
      }

      return {
        isLocked: data.is_locked || false,
        lockedAt: data.locked_at,
        lockedBy: data.locked_by
      };
    } catch (error) {
      console.error('Unexpected error checking period status:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  /**
   * Bloquea un período de pago utilizando la función de base de datos
   */
  const lockPeriod = useCallback(async (
    periodId: string, 
    paymentMethod?: string, 
    paymentReference?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.rpc('lock_payment_period', {
        period_id: periodId,
        payment_method_used: paymentMethod,
        payment_ref: paymentReference
      });

      if (error) {
        console.error('Error locking period:', error);
        showError("No se pudo bloquear el período de pago");
        return false;
      }

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        const result = data as { success: boolean; locked_records?: number; message?: string };
        showSuccess("Período Bloqueado", `Período bloqueado exitosamente. Se protegieron ${result.locked_records || 0} registros.`);
        return true;
      } else {
        const result = data as { message?: string } | null;
        showError(result?.message || "No se pudo bloquear el período");
        return false;
      }
    } catch (error) {
      console.error('Unexpected error locking period:', error);
      showError("Error inesperado al bloquear el período");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  /**
   * Ejecuta una acción protegida y maneja automáticamente los errores RLS
   */
  const handleProtectedAction = useCallback(async (
    action: () => Promise<any>,
    errorMessage?: string
  ): Promise<any> => {
    const defaultErrorMessage = "No se puede modificar: El período de pago está bloqueado";
    
    try {
      setIsLoading(true);
      return await action();
    } catch (error: any) {
      console.error('Protected action error:', error);
      
      // Error específico de RLS - período bloqueado
      if (error?.code === '42501' || error?.message?.includes('row-level security policy')) {
        showError(errorMessage || defaultErrorMessage);
        return null;
      }
      
      // Otros errores específicos de Supabase
      if (error?.code === 'PGRST116') {
        showError("El registro solicitado no existe o no tienes permisos para acceder a él");
        return null;
      }

      // Error genérico
      showError(error?.message || "Ocurrió un error inesperado");
      
      // Re-lanzar el error para que el componente pueda manejarlo si es necesario
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  return {
    checkPeriodStatus,
    lockPeriod,
    handleProtectedAction,
    isLoading,
  };
};

/**
 * Hook simple para verificar si un período está bloqueado
 * Útil para deshabilitar UI preventivamente
 */
export const useIsPeriodLocked = (periodId?: string) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { checkPeriodStatus } = usePaymentPeriodProtection();

  const checkStatus = useCallback(async () => {
    if (!periodId) return;
    
    setLoading(true);
    const status = await checkPeriodStatus(periodId);
    setIsLocked(status?.isLocked || false);
    setLoading(false);
  }, [periodId, checkPeriodStatus]);

  return {
    isLocked,
    loading,
    refresh: checkStatus,
  };
};