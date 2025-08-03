
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export const useLoadNumberValidation = (loadNumber: string, skipValidation = false, excludeLoadId?: string) => {
  // console.log('🔍 useLoadNumberValidation CALLED - loadNumber:', loadNumber, 'skipValidation:', skipValidation, 'excludeLoadId:', excludeLoadId);
  
  const [isValidating, setIsValidating] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedLoadNumber = useDebounce(loadNumber, 500);
  
  // console.log('🔍 useLoadNumberValidation - debouncedLoadNumber:', debouncedLoadNumber, 'original:', loadNumber);

  useEffect(() => {
    const validateLoadNumber = async () => {
      // console.log('🔍 Validating load number:', debouncedLoadNumber, 'skipValidation:', skipValidation);
      
      // Reset states first
      setIsDuplicate(false);
      setError(null);
      setIsValidating(false);
      
      // No validar si está vacío, muy corto o si se debe omitir
      if (!debouncedLoadNumber || debouncedLoadNumber.length < 2 || skipValidation) {
        // console.log('🔍 Skipping validation:', { debouncedLoadNumber, length: debouncedLoadNumber?.length, skipValidation });
        return;
      }

      console.log('🔍 Starting validation for:', debouncedLoadNumber);
      setIsValidating(true);

      try {
        let query = supabase
          .from('loads')
          .select('id')
          .eq('load_number', debouncedLoadNumber);
        
        // Si estamos editando, excluir la carga actual
        if (excludeLoadId) {
          console.log('🔍 Excluding load ID from validation:', excludeLoadId);
          query = query.neq('id', excludeLoadId);
        }
        
        const { data, error: queryError } = await query
          .limit(1)
          .maybeSingle();

        console.log('🔍 Validation result:', { data, queryError });

        if (queryError) {
          console.error('🔍 Query error:', queryError);
          setError('Error al validar número de carga');
        } else {
          const isDuplicateResult = !!data;
          console.log('🔍 Is duplicate?', isDuplicateResult);
          setIsDuplicate(isDuplicateResult);
        }
      } catch (err) {
        console.error('🔍 Validation error:', err);
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
