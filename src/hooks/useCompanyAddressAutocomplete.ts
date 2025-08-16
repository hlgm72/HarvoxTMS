import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompanyAddress {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export function useCompanyAddressAutocomplete() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['company-addresses', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('company_clients')
        .select('id, name, address')
        .ilike('name', `%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      return (data || []).map(company => ({
        id: company.id,
        name: company.name,
        address: company.address || '',
        // Parse address if it contains city, state, zip
        city: '',
        state: '',
        zipCode: ''
      }));
    },
    enabled: searchTerm.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    companies,
    isLoading,
    searchTerm,
    setSearchTerm
  };
}