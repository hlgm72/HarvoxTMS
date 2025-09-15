import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface DiagnosticResult {
  recent_periods_count: number;
  recent_calculations_count: number;
  failed_calculations_count: number;
  pending_loads_count: number;
  orphaned_calculations_count: number;
  diagnosis_date: string;
  status: 'NORMAL' | 'PROBLEMAS_DETECTADOS' | 'CARGAS_SIN_PERIODO' | 'CALCULOS_HUERFANOS';
  recommendations: string;
}

export const usePaymentPeriodDiagnostic = () => {
  const { showSuccess, showError, showInfo } = useFleetNotifications();
  const queryClient = useQueryClient();

  // Query para ejecutar diagnóstico automático
  const diagnosticQuery = useQuery({
    queryKey: ['payment-period-diagnostic'],
    queryFn: async (): Promise<DiagnosticResult> => {
      const { data, error } = await supabase.rpc('diagnose_payment_period_calculations');
      
      if (error) {
        console.error('Error en diagnóstico:', error);
        throw new Error(`Error ejecutando diagnóstico: ${error.message}`);
      }
      
      return data as unknown as DiagnosticResult;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 15000, // Considerar datos frescos por 15 segundos
  });

  // Mutation para corregir problemas automáticamente
  const fixCalculationsMutation = useMutation({
    mutationFn: async () => {
      console.log('🔧 Ejecutando corrección automática de cálculos...');
      
      const { data, error } = await supabase.rpc('fix_payment_period_calculations_safe');
      
      if (error) {
        console.error('Error en corrección automática:', error);
        throw new Error(`Error corrigiendo cálculos: ${error.message}`);
      }
      
      console.log('✅ Corrección completada:', data);
      return data;
    },
    onSuccess: (result: any) => {
      showSuccess(`✅ Corrección completada: ${result.fixed_calculations || 0} cálculos corregidos`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payment-period-diagnostic'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      
      if (result.error_count > 0) {
        showInfo(`⚠️ Se encontraron ${result.error_count} errores durante la corrección`);
      }
    },
    onError: (error: Error) => {
      console.error('❌ Error en corrección automática:', error);
      showError(`❌ Error corrigiendo cálculos: ${error.message}`);
    }
  });

  // Función para evaluar si el sistema necesita intervención
  const needsAttention = (diagnostic?: DiagnosticResult) => {
    if (!diagnostic) return false;
    
    return diagnostic.status !== 'NORMAL' || 
           diagnostic.failed_calculations_count > 0 ||
           diagnostic.pending_loads_count > 0 ||
           diagnostic.orphaned_calculations_count > 0;
  };

  // Función para obtener el nivel de severidad
  const getSeverityLevel = (diagnostic?: DiagnosticResult): 'low' | 'medium' | 'high' => {
    if (!diagnostic) return 'low';
    
    if (diagnostic.failed_calculations_count > 5) return 'high';
    if (diagnostic.failed_calculations_count > 0 || diagnostic.pending_loads_count > 3) return 'medium';
    return 'low';
  };

  return {
    diagnostic: diagnosticQuery.data,
    isLoading: diagnosticQuery.isLoading,
    error: diagnosticQuery.error,
    refetch: diagnosticQuery.refetch,
    
    // Acciones
    fixCalculations: fixCalculationsMutation.mutate,
    isFixing: fixCalculationsMutation.isPending,
    
    // Utilidades
    needsAttention: needsAttention(diagnosticQuery.data),
    severityLevel: getSeverityLevel(diagnosticQuery.data),
    
    // Status helpers
    hasProblems: diagnosticQuery.data?.status === 'PROBLEMAS_DETECTADOS',
    hasPendingLoads: diagnosticQuery.data?.pending_loads_count > 0,
    hasOrphanedCalculations: diagnosticQuery.data?.orphaned_calculations_count > 0,
  };
};