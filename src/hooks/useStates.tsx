import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface State {
  id: string;
  name: string;
}

export function useStates() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useFleetNotifications();

  useEffect(() => {
    const fetchStates = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('states')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('Error fetching states:', error);
          showError('Error cargando estados', 'No se pudieron cargar los estados');
          return;
        }

        setStates(data || []);
      } catch (error) {
        console.error('Error fetching states:', error);
        showError('Error cargando estados', 'No se pudieron cargar los estados');
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, [showError]);

  return { states, loading };
}