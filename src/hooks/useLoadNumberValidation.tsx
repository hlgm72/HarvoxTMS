
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export const useLoadNumberValidation = (loadNumber: string, skipValidation = false, excludeLoadId?: string) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedLoadNumber = useDebounce(loadNumber, 500);

  useEffect(() => {
    const validateLoadNumber = async () => {
      // Reset states first
      setIsDuplicate(false);
      setError(null);
      setIsValidating(false);
      
      // No validar si está vacío, muy corto o si se debe omitir
      if (!debouncedLoadNumber || debouncedLoadNumber.length < 2 || skipValidation) {
        return;
      }

      setIsValidating(true);

      try {
        let query = supabase
          .from('loads')
          .select('id')
          .eq('load_number', debouncedLoadNumber);
        
        // Si estamos editando, excluir la carga actual
        if (excludeLoadId) {
          query = query.neq('id', excludeLoadId);
        }
        
        const { data, error: queryError } = await query
          .limit(1)
          .maybeSingle();

        if (queryError) {
          console.error('Query error:', queryError);
          setError('Error al validar número de carga');
        } else {
          setIsDuplicate(!!data);
        }
      } catch (err) {
        console.error('Validation error:', err);
        setError('Error al validar número de carga');
      } finally {
        setIsValidating(false);
      }
    };

    validateLoadNumber();
  }, [debouncedLoadNumber, skipValidation, excludeLoadId]);

  return {
    isValidating,
    isDuplicate,
    error,
    isValid: !isDuplicate && !error && debouncedLoadNumber && debouncedLoadNumber.length >= 2
  };
};
