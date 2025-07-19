import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export const useLoadNumberValidation = (loadNumber: string, skipValidation = false) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedLoadNumber = useDebounce(loadNumber, 500);

  useEffect(() => {
    const validateLoadNumber = async () => {
      // No validar si está vacío, muy corto o si se debe omitir
      if (!debouncedLoadNumber || debouncedLoadNumber.length < 2 || skipValidation) {
        setIsDuplicate(false);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('loads')
          .select('id')
          .eq('load_number', debouncedLoadNumber)
          .limit(1)
          .maybeSingle();

        if (queryError) {
          setError('Error al validar número de carga');
          setIsDuplicate(false);
        } else {
          setIsDuplicate(!!data);
        }
      } catch (err) {
        setError('Error al validar número de carga');
        setIsDuplicate(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateLoadNumber();
  }, [debouncedLoadNumber, skipValidation]);

  return {
    isValidating,
    isDuplicate,
    error,
    isValid: !isDuplicate && !error && debouncedLoadNumber.length >= 2
  };
};