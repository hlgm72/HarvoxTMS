
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
        
        // Primero obtenemos la info del usuario y su compañía
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Usuario no autenticado');
          return;
        }

        // Obtenemos la compañía del usuario
        const { data: userCompany } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!userCompany) {
          setError('No se encontró la compañía del usuario');
          return;
        }

        // Ahora buscamos cargas con ese número que pertenezcan a la compañía
        // Ya sea por tener un conductor de la compañía o por haber sido creadas por alguien de la compañía
        const { data: companyDrivers } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompany.company_id)
          .eq('is_active', true);

        const companyUserIds = companyDrivers?.map(d => d.user_id) || [];

        let query = supabase
          .from('loads')
          .select('id, load_number')
          .eq('load_number', debouncedLoadNumber)
          .or(`driver_user_id.in.(${companyUserIds.join(',')}),created_by.in.(${companyUserIds.join(',')})`);
        
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
