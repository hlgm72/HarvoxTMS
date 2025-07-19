import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export const useLoadNumberValidation = (loadNumber: string, skipValidation = false) => {
  console.log('🔍 useLoadNumberValidation CALLED - loadNumber:', loadNumber, 'skipValidation:', skipValidation);
  
  const [isValidating, setIsValidating] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedLoadNumber = useDebounce(loadNumber, 500);
  
  console.log('🔍 useLoadNumberValidation - debouncedLoadNumber:', debouncedLoadNumber, 'original:', loadNumber);

  useEffect(() => {
    const validateLoadNumber = async () => {
      console.log('🔍 Validating load number:', debouncedLoadNumber, 'skipValidation:', skipValidation);
      
      // No validar si está vacío, muy corto o si se debe omitir
      if (!debouncedLoadNumber || debouncedLoadNumber.length < 2 || skipValidation) {
        console.log('🔍 Skipping validation:', { debouncedLoadNumber, length: debouncedLoadNumber?.length, skipValidation });
        setIsDuplicate(false);
        setError(null);
        setIsValidating(false);
        return;
      }

      console.log('🔍 Starting validation for:', debouncedLoadNumber);
      setIsValidating(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('loads')
          .select('id')
          .eq('load_number', debouncedLoadNumber)
          .limit(1)
          .maybeSingle();

        console.log('🔍 Validation result:', { data, queryError });

        if (queryError) {
          console.error('🔍 Query error:', queryError);
          setError('Error al validar número de carga');
          setIsDuplicate(false);
        } else {
          const isDuplicateResult = !!data;
          console.log('🔍 Is duplicate?', isDuplicateResult);
          setIsDuplicate(isDuplicateResult);
        }
      } catch (err) {
        console.error('🔍 Validation error:', err);
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