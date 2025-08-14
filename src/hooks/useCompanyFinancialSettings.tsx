import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

export interface CompanyFinancialSettings {
  id: string;
  company_id: string;
  ein?: string;
  default_leasing_percentage: number;
  default_factoring_percentage: number;
  default_dispatching_percentage: number;
  payment_cycle_start_day: number;
  payment_day: string;
  default_payment_frequency: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export function useCompanyFinancialSettings(companyId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company-financial-settings', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      
      // Log access to financial data
      await supabase.rpc('log_company_data_access', {
        company_id_param: companyId,
        access_type_param: 'financial_data',
        action_param: 'view'
      });
      
      const { data, error } = await supabase
        .from('company_financial_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as CompanyFinancialSettings | null;
    },
    enabled: !!companyId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateCompanyFinancialSettings() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (data: Partial<CompanyFinancialSettings> & { company_id: string }) => {
      const { company_id, ...updateData } = data;
      
      // Log access to financial data
      await supabase.rpc('log_company_data_access', {
        company_id_param: company_id,
        access_type_param: 'financial_data',
        action_param: 'update'
      });

      const { data: result, error } = await supabase
        .from('company_financial_settings')
        .upsert({
          ...updateData,
          company_id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['company-financial-settings', data.company_id] 
      });
      showSuccess('Financial settings updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error updating financial settings:', error);
      showError(`Error updating financial settings: ${error.message}`);
    },
  });
}

export function useCreateCompanyFinancialSettings() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (data: Omit<CompanyFinancialSettings, 'id' | 'created_at' | 'updated_at'>) => {
      // Log access to financial data
      await supabase.rpc('log_company_data_access', {
        company_id_param: data.company_id,
        access_type_param: 'financial_data',
        action_param: 'create'
      });

      const { data: result, error } = await supabase
        .from('company_financial_settings')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['company-financial-settings', data.company_id] 
      });
      showSuccess('Financial settings created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating financial settings:', error);
      showError(`Error creating financial settings: ${error.message}`);
    },
  });
}