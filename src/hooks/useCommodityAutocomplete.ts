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
      if (debouncedSearchTerm.length < 2) {
        setCommodities([]);
        return;
      }

      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('loads')
          .select('commodity')
          .not('commodity', 'is', null)
          .ilike('commodity', `%${debouncedSearchTerm}%`)
          .limit(10);

        if (error) {
          console.error('Error fetching commodities:', error);
          setCommodities([]);
          return;
        }

        // Get unique commodities and convert to options
        const uniqueCommodities = Array.from(
          new Set(data?.map(item => item.commodity).filter(Boolean))
        ).map(commodity => ({
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