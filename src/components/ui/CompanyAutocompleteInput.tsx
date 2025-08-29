import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Command, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command';
import { useCompanyAutocomplete, CompanyOption } from '@/hooks/useCompanyAutocomplete';
import { Building, MapPin, Phone } from 'lucide-react';

interface CompanyAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onCompanySelect?: (company: CompanyOption) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export function CompanyAutocompleteInput({
  value,
  onChange,
  onBlur,
  onCompanySelect,
  placeholder = "Buscar empresa...",
  label = "Empresa",
  required = false,
  className
}: CompanyAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get search results
  const { companies, isLoading } = useCompanyAutocomplete(inputValue);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleSelect = (company: CompanyOption) => {
    setInputValue(company.label);
    onChange(company.label);
    setIsOpen(false);
    inputRef.current?.focus();
    
    // Call the onCompanySelect callback to auto-fill address fields
    if (onCompanySelect) {
      onCompanySelect(company);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only close if not clicking on suggestions
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!containerRef.current?.contains(relatedTarget)) {
      setIsOpen(false);
      onBlur?.();
    }
  };

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div ref={containerRef} className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={className}
        />
        
        {isOpen && (companies.length > 0 || isLoading) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-hidden">
            <Command className="border-0">
              <CommandList>
                {isLoading ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Buscando empresas...
                  </div>
                ) : companies.length === 0 ? (
                  <CommandEmpty>
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No se encontraron empresas
                    </div>
                  </CommandEmpty>
                ) : (
                  companies.map((company) => (
                    <CommandItem
                      key={company.value}
                      value={company.value}
                      onSelect={() => handleSelect(company)}
                      className="cursor-pointer hover:bg-accent p-3"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Building className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{company.label}</div>
                          {company.address && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{company.address}</span>
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  );
}