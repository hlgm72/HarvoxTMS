import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyCache } from './useCompanyCache';

export interface ClientSearchResult {
  id: string;
  name: string;
  dot_number: string | null;
  mc_number: string | null;
}

export function useClientSearch(searchTerm: string, enabled: boolean = true) {
  const { userCompany } = useCompanyCache();
  const companyId = userCompany?.company_id;

  return useQuery({
    queryKey: ['client-search', companyId, searchTerm],
    queryFn: async () => {
      if (!companyId || !searchTerm || searchTerm.length < 3) {
        return [];
      }

      // Buscar por nombre, DOT o MC (case insensitive)
      const { data, error } = await supabase
        .from('company_clients')
        .select('id, name, dot_number, mc_number')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,dot_number.ilike.%${searchTerm}%,mc_number.ilike.%${searchTerm}%`)
        .order('name')
        .limit(20);

      if (error) {
        console.error('Error searching clients:', error);
        throw error;
      }

      return (data || []) as ClientSearchResult[];
    },
    enabled: enabled && !!companyId && searchTerm.length >= 3,
    staleTime: 30000, // Cache for 30 seconds
  });
}
