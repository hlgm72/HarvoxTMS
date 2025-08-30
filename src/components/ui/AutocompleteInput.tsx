import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Command, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command';

interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  searchHook: (searchTerm: string) => { commodities: AutocompleteOption[]; isLoading: boolean };
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onBlur,
  placeholder,
  searchHook,
  className
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isSelecting, setIsSelecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get search results
  const { commodities, isLoading } = searchHook(inputValue);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSelecting) {
      setIsSelecting(false);
      return;
    }
    
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleSelect = (selectedValue: string) => {
    setIsSelecting(true);
    setInputValue(selectedValue);
    onChange(selectedValue);
    setIsOpen(false);
    
    // Use setTimeout to ensure the selection is processed
    setTimeout(() => {
      setIsSelecting(false);
    }, 100);
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
      
      {isOpen && (commodities.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-hidden">
          <Command className="border-0">
            <CommandList>
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Buscando commodities...
                </div>
              ) : commodities.length === 0 ? (
                <CommandEmpty>
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No se encontraron commodities
                  </div>
                </CommandEmpty>
              ) : (
                commodities.map((commodity) => (
                  <CommandItem
                    key={commodity.value}
                    value={commodity.value}
                    onSelect={() => handleSelect(commodity.value)}
                    className="cursor-pointer hover:bg-accent"
                  >
                    {commodity.label}
                  </CommandItem>
                ))
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}