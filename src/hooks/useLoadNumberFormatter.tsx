import { useState, useCallback } from 'react';

interface UseLoadNumberFormatterProps {
  pattern?: string;
  onChange: (value: string) => void;
}

/**
 * Hook para formatear automáticamente el número de carga según el patrón configurado
 * Soporta patrones comunes como: ^\d{2}-\d{3}[a-zA-Z]{0,2}$
 */
export const useLoadNumberFormatter = ({ pattern, onChange }: UseLoadNumberFormatterProps) => {
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  /**
   * Formatea el valor según el patrón detectado
   */
  const formatValue = useCallback((value: string): string => {
    console.log('🔍 formatValue input:', value, 'pattern:', pattern);
    
    if (!pattern) return value;

    // Detectar patrones comunes y formatear
    // Patrón: ^\d{2}-\d{3}[a-zA-Z]{0,2}$ (Ej: 12-345AB)
    if (pattern.match(/\^\\d\{2\}-\\d\{3\}/)) {
      // Limpiar el valor: extraer solo dígitos y letras
      const cleanValue = value.replace(/[^0-9a-zA-Z]/g, '');
      console.log('🧹 cleanValue:', cleanValue);
      
      let result = '';
      let digitCount = 0;
      let letterCount = 0;
      
      // Procesar caracter por caracter respetando el orden del patrón
      for (const char of cleanValue) {
        // Primero deben ir exactamente 5 dígitos
        if (/\d/.test(char) && digitCount < 5) {
          result += char;
          digitCount++;
          // Agregar guion después del segundo dígito
          if (digitCount === 2) {
            result += '-';
          }
        }
        // Después pueden ir hasta 2 letras (solo cuando ya tenemos 5 dígitos)
        else if (/[a-zA-Z]/.test(char) && digitCount === 5 && letterCount < 2) {
          result += char.toUpperCase();
          letterCount++;
        }
        // Si es una letra pero aún no tenemos 5 dígitos, ignorarla (no válido según el patrón)
      }
      
      console.log('✅ formatValue output:', result);
      return result;
    }

    // Patrón: ^[a-zA-Z]{2}-\d{2}$ o ^[A-Za-z]{2}-\d{2}$ (Ej: AB-12)
    if (pattern.match(/\^\[a-zA-Z\]\{2\}-\\d\{2\}/) || pattern.match(/\^\[A-Za-z\]\{2\}-\\d\{2\}/)) {
      // Limpiar el valor: extraer solo letras y dígitos
      const cleanValue = value.replace(/[^0-9a-zA-Z]/g, '');
      console.log('🧹 cleanValue (letters-digits):', cleanValue);
      
      let result = '';
      let letterCount = 0;
      let digitCount = 0;
      
      // Procesar caracter por caracter respetando el orden del patrón
      for (const char of cleanValue) {
        // Primero deben ir exactamente 2 letras
        if (/[a-zA-Z]/.test(char) && letterCount < 2) {
          result += char.toUpperCase();
          letterCount++;
          // Agregar guion después de la segunda letra
          if (letterCount === 2) {
            result += '-';
          }
        }
        // Después pueden ir hasta 2 dígitos (solo cuando ya tenemos 2 letras)
        else if (/\d/.test(char) && letterCount === 2 && digitCount < 2) {
          result += char;
          digitCount++;
        }
      }
      
      console.log('✅ formatValue output (letters-digits):', result);
      return result;
    }

    // Remover caracteres no válidos según el patrón (para otros patrones)
    let cleaned = value.replace(/[^0-9a-zA-Z]/g, '');

    // Patrón: ^\d{3}-\d{4}$ (Ej: 123-4567)
    if (pattern.match(/\^\\d\{3\}-\\d\{4\}/)) {
      const digits = cleaned.replace(/[^0-9]/g, '').slice(0, 7);
      if (digits.length <= 3) {
        return digits;
      } else {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      }
    }

    // Patrón: ^\d{4}-\d{3}$ (Ej: 2024-001)
    if (pattern.match(/\^\\d\{4\}-\\d\{3\}/)) {
      const digits = cleaned.replace(/[^0-9]/g, '').slice(0, 7);
      if (digits.length <= 4) {
        return digits;
      } else {
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
      }
    }

    // Patrón genérico con guiones: detectar posición del guion
    const dashMatch = pattern.match(/\\d\{(\d+)\}-\\d\{(\d+)\}/);
    if (dashMatch) {
      const firstGroup = parseInt(dashMatch[1]);
      const secondGroup = parseInt(dashMatch[2]);
      const totalDigits = firstGroup + secondGroup;
      
      const digits = cleaned.replace(/[^0-9]/g, '').slice(0, totalDigits);
      
      if (digits.length <= firstGroup) {
        return digits;
      } else {
        return `${digits.slice(0, firstGroup)}-${digits.slice(firstGroup)}`;
      }
    }

    // Si no coincide con ningún patrón conocido, devolver el valor limpio
    return cleaned;
  }, [pattern]);

  /**
   * Handler para el cambio de valor del input
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    console.log('📝 handleChange - raw input value:', input.value);
    const newValue = formatValue(input.value);
    console.log('📝 handleChange - formatted value:', newValue);
    
    onChange(newValue);
    
    // Guardar la posición del cursor para restaurarla después del formato
    if (input.selectionStart !== null) {
      setCursorPosition(input.selectionStart);
    }
  }, [formatValue, onChange]);

  /**
   * Restaurar la posición del cursor después del formato
   */
  const restoreCursor = useCallback((input: HTMLInputElement) => {
    if (cursorPosition !== null && input) {
      input.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [cursorPosition]);

  return {
    handleChange,
    formatValue,
    restoreCursor
  };
};
