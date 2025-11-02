import { useMemo } from 'react';
import { regexToMask } from '@/lib/regexToMask';

interface UseLoadNumberFormatterProps {
  pattern?: string;
  onChange: (value: string) => void;
}

/**
 * Hook para formatear automáticamente el número de carga usando input mask
 * Convierte el patrón regex en una máscara (ej: ^\d{2}-\d{3}[A-Z]{0,2}$ → "99-999aa")
 */
export const useLoadNumberFormatter = ({ pattern, onChange }: UseLoadNumberFormatterProps) => {
  // Convertir el patrón regex a formato de máscara
  const mask = useMemo(() => {
    if (!pattern) return '';
    return regexToMask(pattern);
  }, [pattern]);

  /**
   * Handler para el cambio de valor del input con máscara
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    onChange(value);
  };

  return {
    mask,
    handleChange,
  };
};
