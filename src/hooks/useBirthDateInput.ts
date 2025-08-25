import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface UseBirthDateInputOptions {
  initialValue?: string;
  onValueChange?: (value: string, isValid: boolean, age?: number) => void;
  minAge?: number;
  maxAge?: number;
}

export function useBirthDateInput({ 
  initialValue = '', 
  onValueChange,
  minAge = 18,
  maxAge = 70
}: UseBirthDateInputOptions = {}) {
  const { i18n } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const isSpanish = i18n.language === 'es';
  const placeholder = isSpanish ? 'dd/mm/aaaa' : 'mm/dd/yyyy';
  const format = isSpanish ? 'DD/MM/YYYY' : 'MM/DD/YYYY';

  const formatDateInput = useCallback((input: string) => {
    // Remove all non-numeric characters
    const numbers = input.replace(/\D/g, '');
    
    // Limit to 8 digits (DDMMYYYY or MMDDYYYY)
    const limitedNumbers = numbers.slice(0, 8);
    
    // Add slashes at appropriate positions
    let formatted = '';
    for (let i = 0; i < limitedNumbers.length; i++) {
      if (i === 2 || i === 4) {
        formatted += '/';
      }
      formatted += limitedNumbers[i];
    }
    
    return formatted;
  }, []);

  const validateDate = useCallback((dateString: string) => {
    if (dateString.length !== 10) {
      return { isValid: false, error: 'Fecha incompleta', age: null };
    }

    const parts = dateString.split('/');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Formato inválido', age: null };
    }

    let day: number, month: number, year: number;

    if (isSpanish) {
      // DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      // MM/DD/YYYY
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    // Validate ranges
    if (month < 1 || month > 12) {
      return { isValid: false, error: 'Mes inválido', age: null };
    }

    if (day < 1 || day > 31) {
      return { isValid: false, error: 'Día inválido', age: null };
    }

    // Create date object
    const date = new Date(year, month - 1, day);
    
    // Check if date is valid (handles leap years, month lengths, etc.)
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day) {
      return { isValid: false, error: 'Fecha inválida', age: null };
    }

    // Check if date is in the future
    const today = new Date();
    if (date > today) {
      return { isValid: false, error: 'La fecha no puede ser futura', age: null };
    }

    // Calculate age
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;

    // Validate age range
    if (actualAge < minAge) {
      return { isValid: false, error: `Debe ser mayor de ${minAge} años`, age: actualAge };
    }

    if (actualAge > maxAge) {
      return { isValid: false, error: `Debe ser menor de ${maxAge} años`, age: actualAge };
    }

    return { isValid: true, error: null, age: actualAge };
  }, [isSpanish, minAge, maxAge]);

  // Efecto para restaurar la posición del cursor después del formateo
  useEffect(() => {
    if (inputRef.current && cursorPosition !== null) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null);
    }
  }, [value, cursorPosition]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const currentCursorPos = input.selectionStart || 0;
    const oldValue = value;
    const newValue = input.value;
    
    // Contar cuántos caracteres se agregaron o eliminaron antes del cursor
    let cursorOffset = 0;
    const oldValueBeforeCursor = oldValue.slice(0, currentCursorPos);
    const newValueBeforeCursor = newValue.slice(0, currentCursorPos);
    
    // Calcular la diferencia en longitud para ajustar el cursor
    const lengthDiff = newValueBeforeCursor.length - oldValueBeforeCursor.length;
    
    const formatted = formatDateInput(newValue);
    setValue(formatted);
    
    // Calcular nueva posición del cursor después del formateo
    let newCursorPos = currentCursorPos;
    
    // Si se formateó el texto, ajustar la posición del cursor
    if (formatted !== newValue) {
      // Contar slashes que se agregaron antes de la posición actual
      const slashesBeforeCursor = (formatted.slice(0, currentCursorPos).match(/\//g) || []).length;
      const slashesInOriginal = (newValue.slice(0, currentCursorPos).match(/\//g) || []).length;
      newCursorPos = currentCursorPos + (slashesBeforeCursor - slashesInOriginal);
    }
    
    // Asegurar que el cursor no esté más allá del final del texto
    newCursorPos = Math.min(newCursorPos, formatted.length);
    
    // Si el cursor cambió de posición, guardarlo para restaurarlo
    if (newCursorPos !== currentCursorPos) {
      setCursorPosition(newCursorPos);
    }

    const validation = validateDate(formatted);
    setError(validation.error);
    
    onValueChange?.(formatted, validation.isValid, validation.age);
  }, [formatDateInput, validateDate, onValueChange, value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys
    if (['Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    // Allow backspace and delete
    if (['Backspace', 'Delete'].includes(e.key)) {
      return;
    }

    // Only allow numeric input
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const formatted = formatDateInput(pastedText);
    setValue(formatted);

    const validation = validateDate(formatted);
    setError(validation.error);
    
    onValueChange?.(formatted, validation.isValid, validation.age);
  }, [formatDateInput, validateDate, onValueChange]);

  const reset = useCallback(() => {
    setValue('');
    setError(null);
    onValueChange?.('', false);
  }, [onValueChange]);

  const setExternalValue = useCallback((newValue: string) => {
    const formatted = formatDateInput(newValue);
    setValue(formatted);
    
    const validation = validateDate(formatted);
    setError(validation.error);
  }, [formatDateInput, validateDate]);

  return {
    value,
    error,
    placeholder,
    format,
    isValid: !error && value.length === 10,
    handleChange,
    handleKeyDown,
    handlePaste,
    reset,
    setValue: setExternalValue,
    inputRef,
  };
}