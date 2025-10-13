
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
      console.log('🔍🔍🔍 VALIDATION START - Input:', {
        original: loadNumber,
        debounced: debouncedLoadNumber,
        skipValidation,
        excludeLoadId
      });

      // Reset states first
      setIsDuplicate(false);
      setError(null);
      setIsValidating(false);
      
      // No validar si está vacío, muy corto o si se debe omitir
      if (!debouncedLoadNumber || debouncedLoadNumber.length < 2 || skipValidation) {
        console.log('🔍 VALIDATION SKIPPED:', {
          isEmpty: !debouncedLoadNumber,
          tooShort: debouncedLoadNumber && debouncedLoadNumber.length < 2,
          skipValidation
        });
        return;
      }

      console.log('🔍 VALIDATION STARTING for:', debouncedLoadNumber);
      setIsValidating(true);

      try {
        console.log('🔍 BUILDING QUERY for load_number:', debouncedLoadNumber);
        let query = supabase
          .from('loads')
          .select('id, load_number')
          .eq('load_number', debouncedLoadNumber);
        
        // Si estamos editando, excluir la carga actual
        if (excludeLoadId) {
          console.log('🔍 EXCLUDING load ID:', excludeLoadId);
          query = query.neq('id', excludeLoadId);
        }
        
        console.log('🔍 EXECUTING QUERY...');
        const { data, error: queryError } = await query
          .limit(1)
          .maybeSingle();

        console.log('🔍🔍🔍 QUERY RESULT:', {
          data,
          error: queryError,
          isDuplicate: !!data,
          loadNumber: debouncedLoadNumber
        });

        if (queryError) {
          console.error('🚨 QUERY ERROR:', queryError);
          setError('Error al validar número de carga');
        } else {
          const isDuplicateResult = !!data;
          console.log('🔍 SETTING isDuplicate to:', isDuplicateResult);
          setIsDuplicate(isDuplicateResult);
        }
      } catch (err) {
        console.error('🚨 VALIDATION EXCEPTION:', err);
        setError('Error al validar número de carga');
      } finally {
        console.log('🔍 VALIDATION FINISHED - isDuplicate:', isDuplicate);
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
