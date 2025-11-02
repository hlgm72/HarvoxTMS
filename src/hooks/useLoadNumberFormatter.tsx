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
    
    if (!pattern) {
      console.log('❌ No pattern defined, returning raw value');
      return value;
    }

    // Detectar patrones comunes y formatear
    // Patrón: ^\d{2}-\d{3}[a-zA-Z]{0,2}$ (Ej: 12-345AB)
    console.log('🔍 Testing pattern against: /\\^\\\\d\\{2\\}-\\\\d\\{3\\}/', pattern.match(/\^\\d\{2\}-\\d\{3\}/));
    if (pattern.match(/\^\\d\{2\}-\\d\{3\}/)) {
      // Limpiar el valor: extraer solo dígitos y letras
      const cleanValue = value.replace(/[^0-9a-zA-Z]/g, '');
      console.log('🧹 cleanValue:', cleanValue);
      
      // Separar dígitos y letras
      let digits = '';
      let letters = '';
      
      for (const char of cleanValue) {
        if (/\d/.test(char) && digits.length < 5) {
          digits += char;
        } else if (/[a-zA-Z]/.test(char) && digits.length === 5 && letters.length < 2) {
          letters += char.toUpperCase();
        }
      }
      
      // Solo agregar el guion si hay al menos 3 dígitos (contenido después del guion)
      let result = '';
      if (digits.length <= 2) {
        result = digits;
      } else {
        result = digits.slice(0, 2) + '-' + digits.slice(2);
      }
      
      // Agregar letras si existen
      if (letters.length > 0) {
        result += letters;
      }
      
      console.log('✅ formatValue output:', result);
      return result;
    }

    // Patrón: ^[a-zA-Z]{2}-\d{2}$ o ^[A-Za-z]{2}-\d{2}$ (Ej: AB-12)
    console.log('🔍 Testing pattern against letters-digits:', {
      test1: pattern.match(/\^\[a-zA-Z\]\{2\}-\\d\{2\}/),
      test2: pattern.match(/\^\[A-Za-z\]\{2\}-\\d\{2\}/)
    });
    if (pattern.match(/\^\[a-zA-Z\]\{2\}-\\d\{2\}/) || pattern.match(/\^\[A-Za-z\]\{2\}-\\d\{2\}/)) {
      console.log('✅ Pattern matched: Letters-Dash-Digits');
      // Limpiar el valor: extraer solo letras y dígitos
      const cleanValue = value.replace(/[^0-9a-zA-Z]/g, '');
      console.log('🧹 cleanValue (letters-digits):', cleanValue);
      
      let letters = '';
      let digits = '';
      
      // Separar letras y dígitos del valor limpio
      for (const char of cleanValue) {
        if (/[a-zA-Z]/.test(char) && letters.length < 2) {
          letters += char.toUpperCase();
        } else if (/\d/.test(char) && letters.length === 2 && digits.length < 2) {
          digits += char;
        }
      }
      
      // Construir resultado: solo agregar el guión si hay dígitos después de las letras
      let result = letters;
      if (letters.length === 2 && digits.length > 0) {
        result += '-' + digits;
      }
      
      console.log('✅ formatValue output (letters-digits):', result, '| letters:', letters, '| digits:', digits);
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
