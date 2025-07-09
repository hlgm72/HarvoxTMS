/**
 * Utility functions for text input handling and validation
 */

/**
 * Controls text input to prevent leading spaces and multiple consecutive spaces
 * Used in onChange handlers
 */
export const handleTextInput = (value: string): string => {
  // If the value is only spaces, return empty string
  if (value.trim() === '') {
    return '';
  }
  
  // Prevent leading spaces by removing them
  let cleanValue = value.replace(/^\s+/, '');
  
  // Replace multiple consecutive spaces with single space
  cleanValue = cleanValue.replace(/\s{2,}/g, ' ');
  
  return cleanValue;
};

/**
 * Handles email input - removes all spaces completely
 * Emails should never have spaces
 */
export const handleEmailInput = (value: string): string => {
  // Remove all spaces completely and return only valid characters
  return value.replace(/\s/g, '');
};

/**
 * Formats phone number input to (xxx) xxx-xxxx format
 * Used for phone number fields
 */
export const handlePhoneInput = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedNumbers = numbers.slice(0, 10);
  
  // Format based on length
  if (limitedNumbers.length === 0) return '';
  if (limitedNumbers.length <= 3) return `(${limitedNumbers}`;
  if (limitedNumbers.length <= 6) return `(${limitedNumbers.slice(0, 3)}) ${limitedNumbers.slice(3)}`;
  return `(${limitedNumbers.slice(0, 3)}) ${limitedNumbers.slice(3, 6)}-${limitedNumbers.slice(6)}`;
};

/**
 * Trims trailing spaces when user finishes editing
 * Used in onBlur handlers
 */
export const handleTextBlur = (value: string): string => {
  return value.trim();
};

/**
 * Combined handler for text fields that need both input control and blur trimming
 */
export const createTextHandlers = (
  setValue: (value: string) => void,
  type: 'text' | 'email' | 'phone' = 'text'
) => {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    let processedValue: string;
    
    switch (type) {
      case 'email':
        processedValue = handleEmailInput(inputValue);
        break;
      case 'phone':
        processedValue = handlePhoneInput(inputValue);
        break;
      default:
        processedValue = handleTextInput(inputValue);
    }
    
    setValue(processedValue);
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // For phones, no additional trimming needed as formatting handles it
    if (type === 'phone') return;
    
    const trimmedValue = handleTextBlur(e.target.value);
    setValue(trimmedValue);
  };

  return { onChange, onBlur };
};

/**
 * Creates phone-specific handlers with formatting
 * Alternative to createTextHandlers for phone fields
 */
export const createPhoneHandlers = (setValue: (value: string) => void) => {
  return {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = handlePhoneInput(e.target.value);
      setValue(formattedValue);
    },
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow only numbers, backspace, delete, arrows, parentheses, spaces, and dashes
      const allowedKeys = /[0-9()\-\s]/;
      const specialKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
      
      if (!allowedKeys.test(e.key) && !specialKeys.includes(e.key)) {
        e.preventDefault();
      }
    }
  };
};