import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

export interface CommodityOption {
  value: string;
  label: string;
}

export const useCommodityAutocomplete = (searchTerm: string) => {
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchCommodities = async () => {
      if (debouncedSearchTerm.length < 3) {
        setCommodities([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // Fetch more records to ensure we get enough unique commodities
        const { data, error } = await supabase
          .from('loads')
          .select('commodity')
          .not('commodity', 'is', null)
          .ilike('commodity', `%${debouncedSearchTerm}%`)
          .limit(100);

        if (error) {
          console.error('Error fetching commodities:', error);
          setCommodities([]);
          return;
        }

        // Get unique commodities and convert to options, then limit to 20
        const uniqueCommodities = Array.from(
          new Set(data?.map(item => item.commodity).filter(Boolean))
        )
        .sort() // Sort alphabetically
        .slice(0, 20) // Limit to 20 unique results
        .map(commodity => ({
          value: commodity!,
          label: commodity!
        }));

        setCommodities(uniqueCommodities);
      } catch (error) {
        console.error('Error in fetchCommodities:', error);
        setCommodities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommodities();
  }, [debouncedSearchTerm]);

  return { commodities, isLoading };
};