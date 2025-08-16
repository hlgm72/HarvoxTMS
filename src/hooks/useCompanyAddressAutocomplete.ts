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

      return (data || []).map(company => {
        // Try to parse address for city, state, zip if it's in a standard format
        const address = company.address || '';
        let city = '', state = '', zipCode = '';
        
        // Look for patterns like "City, ST 12345" at the end of address
        const addressMatch = address.match(/^(.+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/);
        if (addressMatch) {
          const parts = addressMatch[1].split(',');
          if (parts.length >= 2) {
            city = parts[parts.length - 1].trim();
            state = addressMatch[2];
            zipCode = addressMatch[3];
          }
        }
        
        return {
          id: company.id,
          name: company.name,
          address: address,
          city,
          state,
          zipCode
        };
      });
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