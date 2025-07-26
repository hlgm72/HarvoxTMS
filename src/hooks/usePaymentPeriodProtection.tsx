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
        toast({
          title: "Error",
          description: "No se pudo verificar el estado del período de pago",
          variant: "destructive"
        });
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
  }, [toast]);

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
        toast({
          title: "Error",
          description: "No se pudo bloquear el período de pago",
          variant: "destructive"
        });
        return false;
      }

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        const result = data as { success: boolean; locked_records?: number; message?: string };
        toast({
          title: "Período Bloqueado",
          description: `Período bloqueado exitosamente. Se protegieron ${result.locked_records || 0} registros.`,
          variant: "default"
        });
        return true;
      } else {
        const result = data as { message?: string } | null;
        toast({
          title: "Error",
          description: result?.message || "No se pudo bloquear el período",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Unexpected error locking period:', error);
      toast({
        title: "Error",
        description: "Error inesperado al bloquear el período",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
        toast({
          title: "Acción No Permitida",
          description: errorMessage || defaultErrorMessage,
          variant: "destructive"
        });
        return null;
      }
      
      // Otros errores específicos de Supabase
      if (error?.code === 'PGRST116') {
        toast({
          title: "Registro No Encontrado",
          description: "El registro solicitado no existe o no tienes permisos para acceder a él",
          variant: "destructive"
        });
        return null;
      }

      // Error genérico
      toast({
        title: "Error",
        description: error?.message || "Ocurrió un error inesperado",
        variant: "destructive"
      });
      
      // Re-lanzar el error para que el componente pueda manejarlo si es necesario
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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