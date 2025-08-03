import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompanies } from "./useUserCompanies";
import { useFleetNotifications } from "@/components/notifications";

interface DispatcherOtherIncomeData {
  id: string;
  company_id: string;
  dispatcher_user_id: string;
  income_type: string;
  description: string;
  amount: number;
  income_date: string;
  status: string;
  reference_number?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CreateDispatcherOtherIncomeData {
  dispatcher_user_id: string;
  income_type: string;
  description: string;
  amount: number;
  income_date: string;
  reference_number?: string;
  notes?: string;
  status?: string;
}

interface UpdateDispatcherOtherIncomeData {
  income_type?: string;
  description?: string;
  amount?: number;
  income_date?: string;
  reference_number?: string;
  notes?: string;
  status?: string;
}

interface UseDispatcherOtherIncomeFilters {
  dispatcherId?: string;
  status?: string;
}

export function useDispatcherOtherIncome(filters: UseDispatcherOtherIncomeFilters = {}) {
  const { user, isDispatcher } = useAuth();
  const { selectedCompany } = useUserCompanies();

  return useQuery({
    queryKey: ['dispatcher-other-income', selectedCompany?.id, filters],
    queryFn: async (): Promise<DispatcherOtherIncomeData[]> => {
      if (!selectedCompany?.id) {
        return [];
      }

      let query = supabase
        .from('dispatcher_other_income')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      // Si es despachador, solo ver sus propios ingresos
      if (isDispatcher) {
        query = query.eq('dispatcher_user_id', user?.id);
      }

      // Aplicar filtros
      if (filters.dispatcherId) {
        query = query.eq('dispatcher_user_id', filters.dispatcherId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching dispatcher other income:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });
}

export function useCreateDispatcherOtherIncome() {
  const { selectedCompany } = useUserCompanies();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (data: CreateDispatcherOtherIncomeData): Promise<DispatcherOtherIncomeData> => {
      if (!selectedCompany?.id) {
        throw new Error('No company selected');
      }

      const { data: result, error } = await supabase
        .from('dispatcher_other_income')
        .insert({
          company_id: selectedCompany.id,
          dispatcher_user_id: data.dispatcher_user_id,
          income_type: data.income_type,
          description: data.description,
          amount: data.amount,
          income_date: data.income_date,
          reference_number: data.reference_number,
          notes: data.notes,
          status: data.status || 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating dispatcher other income:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-other-income'] });
      showSuccess("Ingreso adicional creado exitosamente");
    },
    onError: (error) => {
      console.error('Error creating dispatcher other income:', error);
      showError("Error al crear el ingreso adicional");
    },
  });
}

export function useUpdateDispatcherOtherIncome() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDispatcherOtherIncomeData }): Promise<DispatcherOtherIncomeData> => {
      const { data: result, error } = await supabase
        .from('dispatcher_other_income')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating dispatcher other income:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-other-income'] });
      showSuccess("Ingreso adicional actualizado exitosamente");
    },
    onError: (error) => {
      console.error('Error updating dispatcher other income:', error);
      showError("Error al actualizar el ingreso adicional");
    },
  });
}

export function useDeleteDispatcherOtherIncome() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('dispatcher_other_income')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting dispatcher other income:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-other-income'] });
      showSuccess("Ingreso adicional eliminado exitosamente");
    },
    onError: (error) => {
      console.error('Error deleting dispatcher other income:', error);
      showError("Error al eliminar el ingreso adicional");
    },
  });
}