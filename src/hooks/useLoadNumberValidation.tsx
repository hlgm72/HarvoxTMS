
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
      setIsDuplicate(false);
      setError(null);
      setIsValidating(false);
      
      if (!debouncedLoadNumber || debouncedLoadNumber.length < 2 || skipValidation) {
        return;
      }

      setIsValidating(true);

      try {
        const { data: loadExists, error: rpcError } = await supabase
          .rpc('check_load_number_exists', {
            load_number_param: debouncedLoadNumber,
            exclude_load_id_param: excludeLoadId || null
          });

        if (rpcError) {
          setError('Error al validar número de carga');
        } else {
          const isDuplicateResult = loadExists === true;
          setIsDuplicate(isDuplicateResult);
        }
      } catch (err) {
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
