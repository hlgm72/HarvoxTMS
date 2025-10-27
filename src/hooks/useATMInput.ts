import { useState, useCallback } from 'react';
import { formatCurrency } from '@/lib/dateFormatting';

interface UseATMInputOptions {
  initialValue?: number;
  onValueChange?: (value: number) => void;
}

export function useATMInput({ initialValue = 0, onValueChange }: UseATMInputOptions = {}) {
  const [value, setValue] = useState(() => initialValue * 100); // Store as cents

  const formatDisplay = useCallback((cents: number) => {
    const dollars = cents / 100;
    return formatCurrency(dollars, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'currency'
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys
    if (['Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();

    if (e.key === 'Backspace' || e.keyCode === 8) {
      const newValue = Math.floor(value / 10);
      setValue(newValue);
      onValueChange?.(newValue / 100);
      return;
    }

    // Handle digits - check key, keyCode, and which for better compatibility
    let digit: number | null = null;
    
    if (e.key && /^\d$/.test(e.key)) {
      digit = parseInt(e.key);
    } else if (e.keyCode >= 48 && e.keyCode <= 57) {
      // Regular number keys (0-9)
      digit = e.keyCode - 48;
    } else if (e.keyCode >= 96 && e.keyCode <= 105) {
      // Numpad keys (0-9)
      digit = e.keyCode - 96;
    } else if (e.which >= 48 && e.which <= 57) {
      // Fallback using which property
      digit = e.which - 48;
    }

    if (digit !== null && digit >= 0 && digit <= 9) {
      const newValue = (value * 10) + digit;
      
      // Prevent overflow (max $99,999.99)
      if (newValue > 9999999) {
        return;
      }

      setValue(newValue);
      onValueChange?.(newValue / 100);
    }
  }, [value, onValueChange]);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    // For mobile keyboards that might not trigger keyDown properly
    const input = e.target as HTMLInputElement;
    const inputValue = input.value;
    
    // Extract only digits from the input
    const digits = inputValue.replace(/\D/g, '');
    
    if (digits && digits !== value.toString()) {
      const newValue = parseInt(digits) || 0;
      setValue(newValue);
      onValueChange?.(newValue / 100);
      
      // Move cursor to the end after value update
      setTimeout(() => {
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    }
  }, [value, onValueChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const cleanText = pastedText.replace(/[^\d.]/g, '');
    const numericValue = parseFloat(cleanText) || 0;
    const newValue = Math.round(numericValue * 100);
    
    // Prevent overflow
    if (newValue > 9999999) {
      return;
    }

    setValue(newValue);
    onValueChange?.(newValue / 100);
  }, [onValueChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target;
    // Defer to next tick to ensure React has finished rendering
    setTimeout(() => {
      if (document.activeElement === input) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 0);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    const input = e.target as HTMLInputElement;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  const reset = useCallback(() => {
    setValue(0);
    onValueChange?.(0);
  }, [onValueChange]);

  const setExternalValue = useCallback((newValue: number) => {
    const cents = Math.round(newValue * 100);
    setValue(cents);
    onValueChange?.(newValue);
  }, [onValueChange]);

  return {
    displayValue: formatDisplay(value),
    numericValue: value / 100,
    handleKeyDown,
    handleInput,
    handlePaste,
    handleFocus,
    handleMouseDown,
    reset,
    setValue: setExternalValue,
  };
}