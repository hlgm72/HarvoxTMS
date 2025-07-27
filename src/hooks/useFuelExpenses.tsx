import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFleetNotifications } from '@/components/notifications';
import { useUserCompanies } from '@/hooks/useUserCompanies';

export interface FuelExpenseFilters {
  driverId?: string;
  periodId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
}

export interface CreateFuelExpenseData {
  driver_user_id: string;
  payment_period_id: string;
  transaction_date: string;
  fuel_type: string;
  gallons_purchased: number;
  price_per_gallon: number;
  total_amount: number;
  station_name?: string;
  station_state?: string;
  fuel_card_number?: string;
  vehicle_id?: string;
  receipt_url?: string;
  notes?: string;
  
  // Campos adicionales de PDF
  gross_amount?: number;
  discount_amount?: number;
  fees?: number;
  invoice_number?: string;
}

export interface UpdateFuelExpenseData extends Partial<CreateFuelExpenseData> {
  id: string;
}

export function useFuelExpenses(filters: FuelExpenseFilters = {}) {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();

  return useQuery({
    queryKey: ['fuel-expenses', user?.id, selectedCompany?.id, filters],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) {
        throw new Error('User or company not found');
      }

      let query = supabase
        .from('fuel_expenses')
        .select(`
          *,
          company_equipment:vehicle_id (
            id,
            equipment_number,
            license_plate,
            make,
            model,
            year
          )
        `)
        .order('transaction_date', { ascending: false });

      // Aplicar filtros
      if (filters.driverId && filters.driverId !== 'all') {
        query = query.eq('driver_user_id', filters.driverId);
      }

      if (filters.periodId && filters.periodId !== 'all') {
        query = query.eq('payment_period_id', filters.periodId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.vehicleId && filters.vehicleId !== 'all') {
        query = query.eq('vehicle_id', filters.vehicleId);
      }

      if (filters.startDate && filters.endDate) {
        query = query
          .gte('transaction_date', filters.startDate)
          .lte('transaction_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching fuel expenses:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });
}

export function useCreateFuelExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (data: CreateFuelExpenseData) => {
      const { data: result, error } = await supabase
        .from('fuel_expenses')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating fuel expense:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      showSuccess('Gasto de combustible creado exitosamente');
      queryClient.invalidateQueries({ 
        queryKey: ['fuel-expenses', user?.id, selectedCompany?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['fuel-stats', user?.id, selectedCompany?.id] 
      });
    },
    onError: (error) => {
      console.error('Error creating fuel expense:', error);
      showError('No se pudo crear el gasto de combustible');
    },
  });
}

export function useUpdateFuelExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateFuelExpenseData) => {
      const { data: result, error } = await supabase
        .from('fuel_expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating fuel expense:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      showSuccess('Gasto de combustible actualizado exitosamente');
      queryClient.invalidateQueries({ 
        queryKey: ['fuel-expenses', user?.id, selectedCompany?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['fuel-stats', user?.id, selectedCompany?.id] 
      });
    },
    onError: (error) => {
      console.error('Error updating fuel expense:', error);
      showError('No se pudo actualizar el gasto de combustible');
    },
  });
}

export function useDeleteFuelExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_expenses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting fuel expense:', error);
        throw error;
      }
    },
    onSuccess: () => {
      showSuccess('Gasto de combustible eliminado exitosamente');
      queryClient.invalidateQueries({ 
        queryKey: ['fuel-expenses', user?.id, selectedCompany?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['fuel-stats', user?.id, selectedCompany?.id] 
      });
    },
    onError: (error) => {
      console.error('Error deleting fuel expense:', error);
      showError('No se pudo eliminar el gasto de combustible');
    },
  });
}

export function useFuelExpense(id: string) {
  return useQuery({
    queryKey: ['fuel-expense', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_expenses')
        .select(`
          *,
          company_equipment:vehicle_id (
            id,
            equipment_number,
            license_plate,
            make,
            model,
            year
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching fuel expense:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });
}