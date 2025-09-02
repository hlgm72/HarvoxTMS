import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface IntegrityIssue {
  type: string;
  period_id: string;
  driver_user_id: string;
  calculated: number;
  expected: number;
  difference: number;
}

export interface IntegrityReport {
  success: boolean;
  company_id: string;
  total_issues: number;
  integrity_status: 'HEALTHY' | 'ISSUES_FOUND';
  issues: IntegrityIssue[];
  checked_at: string;
  checked_by: string;
}

export function usePaymentIntegrityMonitor(companyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Hook para validar integridad
  const validateIntegrity = useQuery({
    queryKey: ['payment-integrity', companyId],
    queryFn: async (): Promise<IntegrityReport> => {
      if (!companyId) throw new Error('Company ID is required');
      
      const { data, error } = await supabase.rpc('validate_payment_calculation_integrity', {
        target_company_id: companyId
      });

      if (error) throw error;
      return data as unknown as IntegrityReport;
    },
    enabled: !!companyId && !!user,
    // Actualizar cada 5 minutos automáticamente
    refetchInterval: 5 * 60 * 1000,
    // Mantener datos durante 2 minutos sin refetch en background
    staleTime: 2 * 60 * 1000,
  });

  // Mutation para corregir problemas automáticamente
  const autoFixIssues = useMutation({
    mutationFn: async (targetCompanyId: string) => {
      const { data, error } = await supabase.rpc('auto_fix_payment_calculation_issues', {
        target_company_id: targetCompanyId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${(data as any).message}`);
      // Invalidar queries relacionadas para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['payment-integrity'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['driver-payment-calculations'] });
    },
    onError: (error: any) => {
      console.error('Error auto-fixing issues:', error);
      toast.error(`❌ Error corrigiendo inconsistencias: ${error.message}`);
    },
  });

  // Mutation para forzar recálculo manual (deshabilitado por ahora)
  const recalculatePeriod = useMutation({
    mutationFn: async ({ periodId, driverUserId }: { periodId: string; driverUserId: string }) => {
      // Por ahora solo mostrar mensaje que está en desarrollo
      throw new Error('Recálculo manual en desarrollo');
    },
    onSuccess: () => {
      toast.success('✅ Período recalculado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['payment-integrity'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
    },
    onError: (error: any) => {
      console.error('Error recalculating period:', error);
      toast.error(`❌ ${error.message}`);
    },
  });

  // Helper para determinar la severidad de los problemas
  const getIssueSeverity = (issue: IntegrityIssue): 'low' | 'medium' | 'high' => {
    const absDifference = Math.abs(issue.difference);
    
    if (absDifference > 100) return 'high';
    if (absDifference > 10) return 'medium';
    return 'low';
  };

  // Helper para agrupar issues por severidad
  const getIssuesBySeverity = (issues: IntegrityIssue[]) => {
    return issues.reduce((acc, issue) => {
      const severity = getIssueSeverity(issue);
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  // Helper para determinar si el sistema está saludable
  const isSystemHealthy = validateIntegrity.data?.integrity_status === 'HEALTHY';

  // Helper para obtener el color del status
  const getStatusColor = () => {
    if (validateIntegrity.isLoading) return 'yellow';
    if (!validateIntegrity.data) return 'gray';
    return isSystemHealthy ? 'green' : 'red';
  };

  return {
    // Data
    integrityReport: validateIntegrity.data,
    isLoading: validateIntegrity.isLoading,
    error: validateIntegrity.error,
    
    // Actions
    autoFixIssues: autoFixIssues.mutate,
    isAutoFixing: autoFixIssues.isPending,
    recalculatePeriod: recalculatePeriod.mutate,
    isRecalculating: recalculatePeriod.isPending,
    
    // Manual refresh
    refreshIntegrity: validateIntegrity.refetch,
    
    // Helpers
    isSystemHealthy,
    getStatusColor,
    getIssueSeverity,
    getIssuesBySeverity: validateIntegrity.data ? getIssuesBySeverity(validateIntegrity.data.issues) : {},
    
    // Quick stats
    totalIssues: validateIntegrity.data?.total_issues || 0,
    highSeverityCount: validateIntegrity.data ? 
      validateIntegrity.data.issues.filter(issue => getIssueSeverity(issue) === 'high').length : 0,
  };
}