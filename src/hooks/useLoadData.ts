
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LoadData {
  id: string;
  load_number: string;
  driver_user_id: string;
  internal_dispatcher_id?: string | null;
  broker_id?: string;
  total_amount: number;
  commodity?: string;
  weight_lbs?: number;
  notes?: string;
  customer_name?: string;
  factoring_percentage?: number;
  dispatching_percentage?: number;
  leasing_percentage?: number;
  status: string;
  pickup_date?: string;
  delivery_date?: string;
  created_at: string;
  updated_at: string;
  stops?: LoadStop[];
}

export interface LoadStop {
  id: string;
  load_id: string;
  stop_number: number;
  stop_type: 'pickup' | 'delivery';
  company_name?: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  contact_name?: string;
  contact_phone?: string;
  reference_number?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  actual_date?: string;
  actual_time?: string;
  special_instructions?: string;
}

export const useLoadData = (loadId?: string) => {
  const [loadData, setLoadData] = useState<LoadData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadId) {
      setLoadData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchLoadData = async () => {
      console.log('🔍 useLoadData - Fetching load data for ID:', loadId);
      setIsLoading(true);
      setError(null);

      try {
        // Fetch load data
        const { data: load, error: loadError } = await supabase
          .from('loads')
          .select('*')
          .eq('id', loadId)
          .single();

        if (loadError) {
          console.error('❌ useLoadData - Error fetching load:', loadError);
          throw new Error(`Error cargando datos de la carga: ${loadError.message}`);
        }

        // Fetch load stops
        const { data: stops, error: stopsError } = await supabase
          .from('load_stops')
          .select('*')
          .eq('load_id', loadId)
          .order('stop_number');

        if (stopsError) {
          console.error('❌ useLoadData - Error fetching stops:', stopsError);
          // Don't throw error for stops, just log and continue
        }

        const loadWithStops: LoadData = {
          ...load,
          stops: (stops || []).map(stop => ({
            ...stop,
            stop_type: stop.stop_type as 'pickup' | 'delivery'
          }))
        };

        console.log('✅ useLoadData - Load data fetched successfully:', loadWithStops);
        setLoadData(loadWithStops);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        console.error('❌ useLoadData - Error:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoadData();
  }, [loadId]);

  return {
    loadData,
    isLoading,
    error,
    refetch: () => {
      if (loadId) {
        // Trigger refetch by updating effect dependency
        setLoadData(null);
        setError(null);
      }
    }
  };
};
