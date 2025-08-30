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

        // Search both in registered clients and load_stops from previous loads
        const uniqueCompanies = new Map();
        
        // 1. First search in registered company clients
        const { data: clientData, error: clientError } = await supabase
          .from('company_clients')
          .select('name, alias, address, phone')
          .in('company_id', companyIds)
          .eq('is_active', true)
          .or(`name.ilike.%${debouncedSearchTerm}%,alias.ilike.%${debouncedSearchTerm}%`)
          .limit(10);

        if (clientError) {
          console.error('Error fetching company clients:', clientError);
        } else {
          clientData?.forEach(client => {
            if (client.name && !uniqueCompanies.has(client.name)) {
              uniqueCompanies.set(client.name, {
                value: client.name,
                label: client.name,
                address: client.address || '',
                phone: client.phone || '',
                city: '',
                state: '',
                zipCode: ''
              });
            }
            // Also add alias if it matches and is different from name
            if (client.alias && 
                client.alias.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
                client.alias !== client.name && 
                !uniqueCompanies.has(client.alias)) {
              uniqueCompanies.set(client.alias, {
                value: client.alias,
                label: `${client.alias} (${client.name})`,
                address: client.address || '',
                phone: client.phone || '',
                city: '',
                state: '',
                zipCode: ''
              });
            }
          });
        }

        // 2. Then search in load_stops from previous loads (only if we haven't reached the limit)
        if (uniqueCompanies.size < 10) {
          const { data: loadStopData, error: loadStopError } = await supabase
            .from('load_stops')
            .select(`
              company_name,
              address,
              city,
              state,
              zip_code,
              loads!inner(company_id)
            `)
            .in('loads.company_id', companyIds)
            .ilike('company_name', `%${debouncedSearchTerm}%`)
            .not('company_name', 'is', null)
            .not('company_name', 'eq', '')
            .limit(10);

          if (loadStopError) {
            console.error('Error fetching load stops:', loadStopError);
          } else {
            loadStopData?.forEach(stop => {
              if (stop.company_name && !uniqueCompanies.has(stop.company_name)) {
                uniqueCompanies.set(stop.company_name, {
                  value: stop.company_name,
                  label: stop.company_name,
                  address: stop.address || '',
                  city: stop.city || '',
                  state: stop.state || '',
                  zipCode: stop.zip_code || ''
                });
              }
            });
          }
        }

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