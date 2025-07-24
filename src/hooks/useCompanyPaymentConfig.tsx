import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PaymentConfig {
  default_payment_frequency: 'weekly' | 'biweekly' | 'monthly';
  payment_cycle_start_day: number; // 1=Monday, 2=Tuesday, etc.
}

export interface PaymentConfigUpdate extends PaymentConfig {
  company_id: string;
}

export const useCompanyPaymentConfig = (companyId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current payment configuration
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['company-payment-config', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      
      const { data, error } = await supabase
        .from('companies')
        .select('default_payment_frequency, payment_cycle_start_day')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data as PaymentConfig;
    },
    enabled: !!companyId,
  });

  // Update payment configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (update: PaymentConfigUpdate) => {
      const { data, error } = await supabase
        .from('companies')
        .update({
          default_payment_frequency: update.default_payment_frequency,
          payment_cycle_start_day: update.payment_cycle_start_day,
        })
        .eq('id', update.company_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-payment-config'] });
      toast.success('Configuración de períodos actualizada');
    },
    onError: (error) => {
      console.error('Error updating payment config:', error);
      toast.error('Error al actualizar la configuración');
    },
  });

  // Generate preview periods based on configuration
  const generatePreviewPeriods = (config: PaymentConfig, startDate: Date, count: number = 4) => {
    const periods = [];
    let currentDate = new Date(startDate);
    
    // Adjust to the correct start day of week
    const dayOfWeek = currentDate.getDay();
    const targetDay = config.payment_cycle_start_day === 7 ? 0 : config.payment_cycle_start_day; // Convert Sunday=7 to 0
    const daysToAdjust = (targetDay - dayOfWeek + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysToAdjust);

    for (let i = 0; i < count; i++) {
      const periodStart = new Date(currentDate);
      let periodEnd = new Date(currentDate);
      
      switch (config.default_payment_frequency) {
        case 'weekly':
          periodEnd.setDate(periodEnd.getDate() + 6);
          break;
        case 'biweekly':
          periodEnd.setDate(periodEnd.getDate() + 13);
          break;
        case 'monthly':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(periodEnd.getDate() - 1);
          break;
      }

      periods.push({
        start: periodStart,
        end: periodEnd,
        type: 'regular' as const,
      });

      // Move to next period
      switch (config.default_payment_frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return periods;
  };

  return {
    config,
    isLoading,
    error,
    updateConfig: updateConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
    generatePreviewPeriods,
  };
};

export const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'weekly' as const, label: 'Semanal' },
  { value: 'biweekly' as const, label: 'Quincenal' },
  { value: 'monthly' as const, label: 'Mensual' },
];

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];