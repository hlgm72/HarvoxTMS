import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  method_type: string;
  description?: string;
  requires_reference: boolean;
  is_active: boolean;
}

interface PaymentReport {
  id: string;
  payment_period_id: string;
  payment_method_id: string;
  amount: number;
  reference_number?: string;
  transaction_date: string;
  notes?: string;
  attachments?: any;
  reported_by: string;
  status: string;
}

/**
 * Hook para manejar métodos de pago y reportes
 */
export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();

  /**
   * Cargar métodos de pago disponibles para la compañía
   */
  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching payment methods:', error);
        showError("No se pudieron cargar los métodos de pago");
        return;
      }

      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      showError("Error inesperado al cargar métodos de pago");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reportar un pago y bloquear el período
   */
  const reportPayment = async (
    periodId: string,
    methodId: string,
    amount: number,
    referenceNumber?: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.rpc('report_payment_and_lock', {
        period_id: periodId,
        method_id: methodId,
        amount_paid: amount,
        reference_num: referenceNumber,
        payment_notes: notes
      });

      if (error) {
        console.error('Error reporting payment:', error);
        showError("No se pudo reportar el pago");
        return false;
      }

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        const result = data as { success: boolean; message?: string; report_id?: string };
        showSuccess("Pago Reportado", result.message || "Pago reportado y período bloqueado exitosamente");
        return true;
      } else {
        const result = data as { message?: string } | null;
        showError(result?.message || "No se pudo reportar el pago");
        return false;
      }
    } catch (error) {
      console.error('Unexpected error reporting payment:', error);
      showError("Error inesperado al reportar el pago");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Crear un nuevo método de pago personalizado
   */
  const createPaymentMethod = async (
    companyId: string,
    name: string,
    methodType: string,
    description?: string,
    requiresReference: boolean = true
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('payment_methods')
        .insert({
          company_id: companyId,
          name,
          method_type: methodType,
          description,
          requires_reference: requiresReference
        });

      if (error) {
        console.error('Error creating payment method:', error);
        showError("No se pudo crear el método de pago");
        return false;
      }

      showSuccess("Método Creado", `Método de pago "${name}" creado exitosamente`);
      
      // Recargar métodos
      await fetchPaymentMethods();
      return true;
    } catch (error) {
      console.error('Unexpected error creating payment method:', error);
      showError("Error inesperado al crear método de pago");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtener reportes de pago para un período
   */
  const getPaymentReports = async (periodId: string): Promise<PaymentReport[]> => {
    try {
      const { data, error } = await supabase
        .from('payment_reports')
        .select(`
          *,
          payment_methods(name, method_type)
        `)
        .eq('payment_period_id', periodId)
        .order('reported_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment reports:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching payment reports:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  return {
    paymentMethods,
    reportPayment,
    createPaymentMethod,
    getPaymentReports,
    fetchPaymentMethods,
    isLoading
  };
};