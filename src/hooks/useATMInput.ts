import { useState, useCallback } from 'react';

interface UseATMInputOptions {
  initialValue?: number;
  onValueChange?: (value: number) => void;
}

export function useATMInput({ initialValue = 0, onValueChange }: UseATMInputOptions = {}) {
  const [value, setValue] = useState(() => initialValue * 100); // Store as cents

  const formatDisplay = useCallback((cents: number) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('🔑 handleKeyDown called with key:', e.key);
    
    // Allow navigation keys
    if (['Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();

    if (e.key === 'Backspace') {
      const newValue = Math.floor(value / 10);
      console.log('🔙 Backspace: new value:', newValue);
      setValue(newValue);
      onValueChange?.(newValue / 100);
      return;
    }

    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      return;
    }

    const digit = parseInt(e.key);
    const newValue = (value * 10) + digit;
    
    // Prevent overflow (max $99,999.99)
    if (newValue > 9999999) {
      return;
    }

    console.log('🔢 Digit added:', digit, 'new value:', newValue);
    setValue(newValue);
    onValueChange?.(newValue / 100);
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

  const reset = useCallback(() => {
    setValue(0);
    onValueChange?.(0);
  }, [onValueChange]);

  const setExternalValue = useCallback((newValue: number) => {
    const cents = Math.round(newValue * 100);
    setValue(cents);
  }, []);

  return {
    displayValue: formatDisplay(value),
    numericValue: value / 100,
    handleKeyDown,
    handlePaste,
    reset,
    setValue: setExternalValue,
  };
}