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
   * Parsea el patrón regex para extraer su estructura
   */
  const parsePattern = useCallback((regexPattern: string): Array<{type: 'digit' | 'letter' | 'separator', length?: number, value?: string}> => {
    const structure: Array<{type: 'digit' | 'letter' | 'separator', length?: number, value?: string}> = [];
    
    // Remover ^ y $ del inicio y fin
    let cleanPattern = regexPattern.replace(/^\^/, '').replace(/\$$/, '');
    
    // Expresiones regex para identificar componentes
    const digitPattern = /\\d\{(\d+)\}/;
    const letterPattern = /\[a-zA-Z\]\{(\d+)\}|\[A-Za-z\]\{(\d+)\}/;
    const anyCharPattern = /\.\{(\d+)\}/;
    
    let i = 0;
    while (i < cleanPattern.length) {
      // Verificar si es un grupo de dígitos
      const digitMatch = cleanPattern.substring(i).match(digitPattern);
      if (digitMatch && cleanPattern.substring(i).startsWith(digitMatch[0])) {
        structure.push({ type: 'digit', length: parseInt(digitMatch[1]) });
        i += digitMatch[0].length;
        continue;
      }
      
      // Verificar si es un grupo de letras
      const letterMatch = cleanPattern.substring(i).match(letterPattern);
      if (letterMatch && cleanPattern.substring(i).startsWith(letterMatch[0])) {
        const length = parseInt(letterMatch[1] || letterMatch[2]);
        structure.push({ type: 'letter', length });
        i += letterMatch[0].length;
        continue;
      }
      
      // Verificar si es un grupo de cualquier caracter
      const anyMatch = cleanPattern.substring(i).match(anyCharPattern);
      if (anyMatch && cleanPattern.substring(i).startsWith(anyMatch[0])) {
        structure.push({ type: 'letter', length: parseInt(anyMatch[1]) });
        i += anyMatch[0].length;
        continue;
      }
      
      // Si es un carácter literal (separador)
      if (cleanPattern[i] === '-' || cleanPattern[i] === '/' || cleanPattern[i] === '.' || cleanPattern[i] === ' ') {
        structure.push({ type: 'separator', value: cleanPattern[i] });
        i++;
        continue;
      }
      
      // Saltar caracteres no reconocidos
      i++;
    }
    
    return structure;
  }, []);

  /**
   * Formatea el valor según el patrón detectado
   */
  const formatValue = useCallback((value: string): string => {
    console.log('🔍 formatValue input:', value, 'pattern:', pattern);
    
    if (!pattern) {
      console.log('❌ No pattern defined, returning raw value');
      return value;
    }

    // Parsear la estructura del patrón
    const structure = parsePattern(pattern);
    console.log('📊 Pattern structure:', structure);
    
    if (structure.length === 0) {
      console.log('⚠️ Could not parse pattern, returning cleaned value');
      return value.replace(/[^0-9a-zA-Z]/g, '');
    }
    
    // Limpiar el valor: extraer solo dígitos y letras
    const cleanValue = value.replace(/[^0-9a-zA-Z]/g, '');
    console.log('🧹 cleanValue:', cleanValue);
    
    // Aplicar el formato según la estructura
    let result = '';
    let charIndex = 0;
    let expectedCharsBeforeSeparator = 0;
    
    for (const segment of structure) {
      if (segment.type === 'separator') {
        // Solo agregar el separador si ya hemos procesado suficientes caracteres
        const currentLength = result.replace(/[^0-9a-zA-Z]/g, '').length;
        
        // Agregar separador solo si hemos completado exactamente la sección anterior
        // y tenemos más caracteres disponibles
        if (currentLength === expectedCharsBeforeSeparator && charIndex < cleanValue.length) {
          result += segment.value;
        }
      } else if (segment.type === 'digit') {
        // Extraer dígitos
        const segmentLength = segment.length || 0;
        let addedInSegment = 0;
        
        while (addedInSegment < segmentLength && charIndex < cleanValue.length) {
          const char = cleanValue[charIndex];
          if (/\d/.test(char)) {
            result += char;
            charIndex++;
            addedInSegment++;
          } else {
            // Si no es un dígito, saltar
            charIndex++;
          }
        }
        
        expectedCharsBeforeSeparator += segmentLength;
      } else if (segment.type === 'letter') {
        // Extraer letras
        const segmentLength = segment.length || 0;
        let addedInSegment = 0;
        
        while (addedInSegment < segmentLength && charIndex < cleanValue.length) {
          const char = cleanValue[charIndex];
          if (/[a-zA-Z]/.test(char)) {
            result += char.toUpperCase();
            charIndex++;
            addedInSegment++;
          } else {
            // Si no es una letra, saltar
            charIndex++;
          }
        }
        
        expectedCharsBeforeSeparator += segmentLength;
      }
    }
    
    console.log('✅ formatValue output:', result);
    return result;
  }, [pattern, parsePattern]);

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
