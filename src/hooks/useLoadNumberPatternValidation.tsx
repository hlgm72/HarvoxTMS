import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';

interface UseLoadNumberPatternValidationProps {
  loadNumber: string;
  pattern?: string;
  skipValidation?: boolean;
}

export const useLoadNumberPatternValidation = ({ 
  loadNumber, 
  pattern,
  skipValidation = false 
}: UseLoadNumberPatternValidationProps) => {
  const { t } = useTranslation('loads');
  const [isValidFormat, setIsValidFormat] = useState(true);
  const [formatError, setFormatError] = useState<string | null>(null);
  
  const debouncedLoadNumber = useDebounce(loadNumber, 300);

  useEffect(() => {
    setIsValidFormat(true);
    setFormatError(null);

    if (!debouncedLoadNumber || skipValidation || !pattern) {
      return;
    }

    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(debouncedLoadNumber);
      
      setIsValidFormat(isValid);
      if (!isValid) {
        setFormatError(t('create_wizard.validation.invalid_pattern_format'));
      }
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      setIsValidFormat(true); // Si el regex es inválido, no bloqueamos
    }
  }, [debouncedLoadNumber, pattern, skipValidation]);

  return {
    isValidFormat,
    formatError,
  };
};
