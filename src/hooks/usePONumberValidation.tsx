import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyCache } from './useCompanyCache';

interface POValidationResult {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
  duplicateLoad?: {
    id: string;
    load_number: string;
  };
}

export const usePONumberValidation = (
  poNumber: string, 
  skipValidation: boolean = false, 
  excludeLoadId?: string
): POValidationResult => {
  const [validationResult, setValidationResult] = useState<POValidationResult>({
    isValid: true,
    isLoading: false,
    error: null
  });

  const [debouncedPONumber] = useDebounce(poNumber, 500);
  const { userCompany, companyUsers } = useCompanyCache();

  console.log('🔍 usePONumberValidation CALLED - poNumber:', poNumber, 'skipValidation:', skipValidation, 'excludeLoadId:', excludeLoadId);

  useEffect(() => {
    console.log('🔍 usePONumberValidation - debouncedPONumber:', debouncedPONumber, 'original:', poNumber);

    const validatePONumber = async () => {
      // Reset state
      setValidationResult({
        isValid: true,
        isLoading: false,
        error: null
      });

      // Skip validation if conditions are met
      if (skipValidation || !debouncedPONumber || !debouncedPONumber.trim() || !userCompany || !companyUsers.length) {
        console.log('⏭️ usePONumberValidation - Skipping validation');
        return;
      }

      console.log('🔍 usePONumberValidation - Starting validation for PO:', debouncedPONumber);
      setValidationResult(prev => ({ ...prev, isLoading: true }));

      try {
        // Query for existing loads with the same PO number in the company
        let query = supabase
          .from('loads')
          .select('id, load_number, po_number')
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`)
          .eq('po_number', debouncedPONumber.trim())
          .limit(1);

        // Exclude current load if editing
        if (excludeLoadId) {
          query = query.neq('id', excludeLoadId);
        }

        const { data: existingLoads, error } = await query;

        if (error) {
          console.error('❌ Error validating PO number:', error);
          setValidationResult({
            isValid: false,
            isLoading: false,
            error: 'Error al validar el número PO'
          });
          return;
        }

        console.log('🔍 usePONumberValidation - Query result:', existingLoads);

        if (existingLoads && existingLoads.length > 0) {
          const duplicateLoad = existingLoads[0];
          console.log('❌ usePONumberValidation - PO number already exists:', duplicateLoad);
          setValidationResult({
            isValid: false,
            isLoading: false,
            error: `El número PO "${debouncedPONumber}" ya existe en la carga ${duplicateLoad.load_number}`,
            duplicateLoad: {
              id: duplicateLoad.id,
              load_number: duplicateLoad.load_number
            }
          });
        } else {
          console.log('✅ usePONumberValidation - PO number is available');
          setValidationResult({
            isValid: true,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('❌ usePONumberValidation - Unexpected error:', error);
        setValidationResult({
          isValid: false,
          isLoading: false,
          error: 'Error inesperado al validar el número PO'
        });
      }
    };

    validatePONumber();
  }, [debouncedPONumber, skipValidation, excludeLoadId, userCompany?.company_id, companyUsers]);

  return validationResult;
};