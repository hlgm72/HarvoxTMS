import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface PaymentPeriod {
  id: string;
  driver_user_id: string;
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  period_type: string;
  status: string;
  gross_earnings: number;
  total_deductions: number;
  other_income: number;
  total_income: number;
  net_payment: number;
  has_negative_balance: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export const usePaymentPeriods = (driverUserId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: paymentPeriods,
    isLoading,
    error
  } = useQuery({
    queryKey: ["payment-periods", driverUserId || user?.id],
    queryFn: async () => {
      const targetUserId = driverUserId || user?.id;
      if (!targetUserId) throw new Error("No user ID available");

      const { data, error } = await supabase
        .from("payment_periods")
        .select("*")
        .eq("driver_user_id", targetUserId)
        .order("period_start_date", { ascending: false });

      if (error) throw error;
      return data as PaymentPeriod[];
    },
    enabled: !!(driverUserId || user?.id),
  });

  const generatePeriodsMutation = useMutation({
    mutationFn: async ({ 
      companyId, 
      fromDate, 
      toDate 
    }: { 
      companyId: string; 
      fromDate: string; 
      toDate: string; 
    }) => {
      const { data, error } = await supabase.rpc("generate_payment_periods", {
        company_id_param: companyId,
        from_date: fromDate,
        to_date: toDate
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment-periods"] });
      const result = data as { periods_created: number; success: boolean; message: string };
      toast({
        title: "Períodos generados",
        description: `Se crearon ${result.periods_created} períodos de pago exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCurrentPeriodMutation = useMutation({
    mutationFn: async ({ 
      driverUserId: targetDriverId, 
      targetDate 
    }: { 
      driverUserId: string; 
      targetDate?: string; 
    }) => {
      const { data, error } = await supabase.rpc("get_current_payment_period", {
        driver_user_id_param: targetDriverId,
        target_date: targetDate || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-periods"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reassignElementMutation = useMutation({
    mutationFn: async ({ 
      elementType, 
      elementId, 
      newPeriodId 
    }: { 
      elementType: string; 
      elementId: string; 
      newPeriodId: string; 
    }) => {
      const { data, error } = await supabase.rpc("reassign_to_payment_period", {
        element_type: elementType,
        element_id: elementId,
        new_period_id: newPeriodId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment-periods"] });
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      const result = data as { success: boolean; message: string };
      toast({
        title: result.success ? "Éxito" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getPeriodElementsMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase.rpc("get_payment_period_elements", {
        period_id_param: periodId
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    paymentPeriods,
    isLoading,
    error,
    generatePeriods: generatePeriodsMutation.mutate,
    isGeneratingPeriods: generatePeriodsMutation.isPending,
    getCurrentPeriod: getCurrentPeriodMutation.mutate,
    isGettingCurrentPeriod: getCurrentPeriodMutation.isPending,
    reassignElement: reassignElementMutation.mutate,
    isReassigningElement: reassignElementMutation.isPending,
    getPeriodElements: getPeriodElementsMutation.mutate,
    isGettingPeriodElements: getPeriodElementsMutation.isPending,
    periodElementsData: getPeriodElementsMutation.data,
  };
};