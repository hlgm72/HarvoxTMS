import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBirthDateInput } from '@/hooks/useBirthDateInput';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CircleCheck } from 'lucide-react';

interface BirthDateInputProps {
  label?: string;
  value?: string;
  onValueChange?: (value: string, isValid: boolean, age?: number) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minAge?: number;
  maxAge?: number;
  'data-testid'?: string;
}

export function BirthDateInput({
  label,
  value: externalValue,
  onValueChange,
  required = false,
  disabled = false,
  className,
  minAge = 18,
  maxAge = 70,
  'data-testid': testId,
}: BirthDateInputProps) {
  const { t } = useTranslation('common');
  
  const {
    value,
    error,
    placeholder,
    format,
    isValid,
    handleChange,
    handleKeyDown,
    handlePaste,
    setValue,
  } = useBirthDateInput({
    initialValue: externalValue || '',
    onValueChange,
    minAge,
    maxAge,
  });

  // Sync external value changes
  React.useEffect(() => {
    if (externalValue !== undefined && externalValue !== value) {
      setValue(externalValue);
    }
  }, [externalValue, value, setValue]);

  const displayLabel = label || t('forms.birthDate');
  const hasError = !!error;

  return (
    <div className={cn('space-y-2', className)}>
      {displayLabel && (
        <Label className={cn(hasError && 'text-destructive')}>
          {displayLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive'
          )}
          maxLength={10}
          data-testid={testId}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${testId}-error` : undefined}
        />
        
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none uppercase">
            {format}
          </div>
        )}
      </div>

      {hasError && (
        <p 
          className="text-sm text-destructive"
          id={testId ? `${testId}-error` : undefined}
        >
          {error}
        </p>
      )}

      {isValid && value && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          {t('forms.validDate')} <CircleCheck className="h-4 w-4 text-green-500" />
        </p>
      )}
    </div>
  );
}