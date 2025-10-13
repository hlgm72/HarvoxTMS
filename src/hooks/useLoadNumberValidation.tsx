
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
        console.log('🔍 CALLING RPC check_load_number_exists:', {
          load_number: debouncedLoadNumber,
          exclude_load_id: excludeLoadId
        });
        
        // Llamar a la función RPC que verifica duplicados sin restricciones RLS
        const { data: loadExists, error: rpcError } = await supabase
          .rpc('check_load_number_exists', {
            load_number_param: debouncedLoadNumber,
            exclude_load_id_param: excludeLoadId || null
          });

        console.log('🔍🔍🔍 RPC RESULT:', {
          loadExists,
          error: rpcError,
          isDuplicate: loadExists === true,
          loadNumber: debouncedLoadNumber
        });

        if (rpcError) {
          console.error('🚨 RPC ERROR:', rpcError);
          setError('Error al validar número de carga');
        } else {
          const isDuplicateResult = loadExists === true;
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
