import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface State {
  id: string;
  name: string;
}

export function useStateInfo(stateId?: string) {
  const [stateName, setStateName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stateId) {
      setStateName('');
      return;
    }

    const fetchStateName = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('states')
          .select('name')
          .eq('id', stateId)
          .single();

        if (error) throw error;
        setStateName(data?.name || '');
      } catch (error) {
        console.error('Error fetching state name:', error);
        setStateName('');
      } finally {
        setLoading(false);
      }
    };

    fetchStateName();
  }, [stateId]);

  return { stateName, loading };
}