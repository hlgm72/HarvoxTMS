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

        // Search for companies in load_stops from previous loads only
        // Get all users from the company first
        const { data: companyUsers } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .in('company_id', companyIds)
          .eq('is_active', true);

        if (!companyUsers || companyUsers.length === 0) {
          setCompanies([]);
          setIsLoading(false);
          return;
        }

        const userIds = companyUsers.map(cu => cu.user_id);

        // Get loads for these users
        const { data: userLoads } = await supabase
          .from('loads')
          .select('id')
          .in('driver_user_id', userIds);

        if (!userLoads || userLoads.length === 0) {
          setCompanies([]);
          setIsLoading(false);
          return;
        }

        // Now get facilities for these companies
        const { data, error } = await supabase
          .from('facilities')
          .select(`
            id,
            name,
            address,
            city,
            state,
            zip_code,
            company_id
          `)
          .in('company_id', companyIds)
          .ilike('name', `%${debouncedSearchTerm}%`)
          .limit(20);

        if (error) {
          console.error('Error fetching companies:', error);
          setCompanies([]);
          return;
        }

        // Remove duplicates and convert to options format
        const uniqueCompanies = new Map();
        
        data?.forEach(facility => {
          if (facility.name && !uniqueCompanies.has(facility.name)) {
            uniqueCompanies.set(facility.name, {
              value: facility.name,
              label: facility.name,
              address: facility.address || '',
              city: facility.city || '',
              state: facility.state || '',
              zipCode: facility.zip_code || ''
            });
          }
        });

        const companyOptions = Array.from(uniqueCompanies.values()).slice(0, 10);
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