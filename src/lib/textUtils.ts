/**
 * Utility functions for text input handling and validation
 */

/**
 * Controls text input to prevent leading spaces and multiple consecutive spaces
 * Used in onChange handlers
 */
export const handleTextInput = (value: string): string => {
  // Prevent leading spaces
  if (value.startsWith(' ')) {
    return value.trimStart();
  }
  
  // Replace multiple consecutive spaces with single space
  return value.replace(/\s{2,}/g, ' ');
};

/**
 * Handles email input - removes all spaces completely
 * Emails should never have spaces
 */
export const handleEmailInput = (value: string): string => {
  return value.replace(/\s/g, '');
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
  type: 'text' | 'email' = 'text'
) => {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const processedValue = type === 'email' 
      ? handleEmailInput(inputValue)
      : handleTextInput(inputValue);
    setValue(processedValue);
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = handleTextBlur(e.target.value);
    setValue(trimmedValue);
  };

  return { onChange, onBlur };
};