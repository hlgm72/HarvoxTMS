import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

export interface CompanyOption {
  value: string;
  label: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
}

export const useCompanyAutocomplete = (searchTerm: string) => {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (debouncedSearchTerm.length < 2) {
        setCompanies([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // Get user's companies first
        const { data: userCompanies } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('is_active', true);

        if (!userCompanies || userCompanies.length === 0) {
          setCompanies([]);
          setIsLoading(false);
          return;
        }

        const companyIds = userCompanies.map(uc => uc.company_id);

        // Search for companies in company_clients table
        const { data, error } = await supabase
          .from('company_clients')
          .select('name, address, phone')
          .in('company_id', companyIds)
          .eq('is_active', true)
          .ilike('name', `%${debouncedSearchTerm}%`)
          .limit(10);

        if (error) {
          console.error('Error fetching companies:', error);
          setCompanies([]);
          return;
        }

        // Convert to options format
        const companyOptions = data?.map(company => ({
          value: company.name,
          label: company.name,
          address: company.address || '',
          phone: company.phone || ''
        })) || [];

        setCompanies(companyOptions);
      } catch (error) {
        console.error('Error in fetchCompanies:', error);
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [debouncedSearchTerm]);

  return { companies, isLoading };
};