import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCompanies } from './useUserCompanies';

interface CompanyPublic {
  id: string;
  name: string;
  street_address?: string;
  state_id?: string;
  zip_code?: string;
  city?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  plan_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CompanyFinancial extends CompanyPublic {
  ein?: string;
  mc_number?: string;
  dot_number?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_title?: string;
  max_vehicles: number;
  max_users: number;
  contract_start_date?: string;
  default_payment_frequency?: string;
  payment_cycle_start_day?: number;
  payment_day?: string;
  default_factoring_percentage?: number;
  default_dispatching_percentage?: number;
  default_leasing_percentage?: number;
  load_assignment_criteria?: string;
}

/**
 * Hook to securely access company data based on user role
 * Uses proper field-level security to prevent data theft
 */
export const useSecureCompanyData = (companyId?: string, requireFinancialAccess = false) => {
  const { selectedCompany, loading: roleLoading } = useUserCompanies();
  
  // Determine if user can access financial data
  const canAccessFinancialData = selectedCompany?.role && [
    'company_owner',
    'operations_manager', 
    'superadmin'
  ].includes(selectedCompany.role);

  return useQuery({
    queryKey: ['secure_company_data', companyId, requireFinancialAccess, selectedCompany?.role],
    queryFn: async () => {
      if (requireFinancialAccess && canAccessFinancialData) {
        // Log access to sensitive financial data
        if (companyId) {
          await supabase.rpc('log_sensitive_company_access', {
            company_id_param: companyId,
            access_type_param: 'financial_data_view'
          });
        }
        
        // Use companies_financial_data view for secure access to sensitive data
        if (companyId) {
          const { data, error } = await supabase
            .from('companies_financial_data')
            .select('*')
            .eq('id', companyId)
            .single();

          if (error) throw error;
          return data;
        } else {
          const { data, error } = await supabase
            .from('companies_financial_data')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data;
        }
      } else {
        // Use companies_basic_info view for non-sensitive data
        if (companyId) {
          const { data, error } = await supabase
            .from('companies_basic_info')
            .select('*')
            .eq('id', companyId)
            .single();

          if (error) throw error;
          
          // Log basic company data access for security audit
          if (data) {
            supabase.rpc('log_company_data_access', {
              company_id_param: data.id,
              access_type_param: 'basic_company_info',
              action_param: 'view'
            });
          }
          
          return data;
        } else {
          const { data, error } = await supabase
            .from('companies_basic_info')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data;
        }
      }
    },
    enabled: !roleLoading && !!selectedCompany,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook specifically for accessing financial company data
 * Will return null if user doesn't have sufficient permissions
 */
export const useCompanyFinancialData = (companyId?: string) => {
  const { selectedCompany, loading: roleLoading } = useUserCompanies();
  
  const canAccessFinancialData = selectedCompany?.role && [
    'company_owner',
    'operations_manager', 
    'superadmin'
  ].includes(selectedCompany.role);

  return useQuery({
    queryKey: ['company_financial_data', companyId, selectedCompany?.role],
    queryFn: async () => {
      if (!canAccessFinancialData) {
        throw new Error('Insufficient permissions to access financial data');
      }

      // Log access to sensitive financial data
      if (companyId) {
        await supabase.rpc('log_sensitive_company_access', {
          company_id_param: companyId,
          access_type_param: 'financial_data_direct'
        });
        
        const { data, error } = await supabase
          .from('companies_financial_data')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;
        return data as CompanyFinancial;
      } else {
        const { data, error } = await supabase
          .from('companies_financial_data')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as CompanyFinancial[];
      }
    },
    enabled: !roleLoading && !!selectedCompany && canAccessFinancialData,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for accessing basic company data (safe for all company users)
 */
export const useCompanyPublicData = (companyId?: string) => {
  const { selectedCompany, loading: roleLoading } = useUserCompanies();

  return useQuery({
    queryKey: ['company_public_data', companyId, selectedCompany?.role],
    queryFn: async () => {
      if (companyId) {
        const { data, error } = await supabase
          .from('companies_basic_info')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;
        return data as CompanyPublic;
      } else {
        const { data, error } = await supabase
          .from('companies_basic_info')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as CompanyPublic[];
      }
    },
    enabled: !roleLoading && !!selectedCompany,
    staleTime: 5 * 60 * 1000,
  });
};