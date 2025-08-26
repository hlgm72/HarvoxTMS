import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ERROR_CODES, type ErrorCode, parseErrorCode } from '@/utils/errorCodes';

/**
 * Hook for translating error codes from Supabase functions
 * Replaces hardcoded Spanish messages with translatable error codes
 */
export const useErrorTranslation = () => {
  const { t, i18n } = useTranslation('errors');

  /**
   * Translate an error code to the current language
   */
  const translateError = (error: string | Error, fallback?: string): string => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Check if it's one of our error codes
    const isErrorCode = Object.values(ERROR_CODES).some(code => 
      errorMessage.startsWith(code)
    );

    if (isErrorCode) {
      const { code, details } = parseErrorCode(errorMessage);
      
      // Try to translate the error code
      const translatedMessage = t(code, { 
        defaultValue: fallback || code,
        // Parse details for interpolation (e.g., "{{number}}" or "{{name}}")
        ...(details && parseDetailsForInterpolation(details))
      });
      
      return translatedMessage;
    }

    // For non-error-code messages, try basic translation or return as-is
    return fallback || errorMessage;
  };

  /**
   * Show a translated error toast
   */
  const showErrorToast = (error: string | Error, fallback?: string) => {
    const translatedMessage = translateError(error, fallback);
    toast.error(translatedMessage);
  };

  /**
   * Handle Supabase errors with proper translation
   */
  const handleSupabaseError = (error: any, context?: string) => {
    console.error(`Supabase error${context ? ` in ${context}` : ''}:`, error);
    
    if (error?.message) {
      showErrorToast(error.message);
    } else if (typeof error === 'string') {
      showErrorToast(error);
    } else {
      showErrorToast('ERROR_OPERATION_FAILED');
    }
  };

  /**
   * Check if an error is a specific error code
   */
  const isErrorCode = (error: string | Error, code: ErrorCode): boolean => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return errorMessage.startsWith(code);
  };

  return {
    translateError,
    showErrorToast,
    handleSupabaseError,
    isErrorCode,
    currentLanguage: i18n.language,
  };
};

/**
 * Parse details string for i18next interpolation
 * Converts "value" to { defaultInterpolation: "value" }
 * Converts "name:John,number:123" to { name: "John", number: "123" }
 */
const parseDetailsForInterpolation = (details: string): Record<string, string> => {
  if (!details) return {};

  // If details contains key:value pairs separated by commas
  if (details.includes(':') && details.includes(',')) {
    const pairs = details.split(',');
    const result: Record<string, string> = {};
    
    pairs.forEach(pair => {
      const [key, value] = pair.split(':');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });
    
    return result;
  }

  // If details contains a single key:value pair
  if (details.includes(':')) {
    const [key, value] = details.split(':');
    if (key && value) {
      return { [key.trim()]: value.trim() };
    }
  }

  // If details is just a simple value, use common interpolation keys
  return { 
    name: details,
    number: details,
    reason: details,
    defaultValue: details 
  };
};