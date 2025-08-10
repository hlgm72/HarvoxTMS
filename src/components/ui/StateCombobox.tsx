
import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface State {
  id: string;
  name: string;
}

interface StateComboboxProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StateCombobox({ 
  value, 
  onValueChange, 
  placeholder = "Selecciona estado...",
  disabled = false 
}: StateComboboxProps) {
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { showError } = useFleetNotifications();

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('states')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setStates(data || []);
    } catch (error) {
      console.error('Error loading states:', error);
      showError("No se pudieron cargar los estados");
    } finally {
      setLoading(false);
    }
  };

  const selectedState = states.find((state) => state.id === value);
  
  const filteredStates = states.filter((state) =>
    state.name.toLowerCase().includes((inputValue || searchTerm).toLowerCase()) ||
    state.id.toLowerCase().includes((inputValue || searchTerm).toLowerCase())
  );

  // Update input value when selection changes
  useEffect(() => {
    if (selectedState && !open) {
      setInputValue(selectedState.name);
    } else if (!selectedState && !open) {
      setInputValue("");
    }
  }, [selectedState, open]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSearchTerm(value);
    if (!open) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    setOpen(true);
  };

  const handleSelect = (state: State | undefined) => {
    onValueChange(state?.id);
    setOpen(false);
    if (state) {
      setInputValue(state.name);
    } else {
      setInputValue("");
    }
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled || loading}
            className="pr-8"
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border shadow-md" style={{ zIndex: 10000 }}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar estado..." 
            className="h-9"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Cargando estados..." : searchTerm ? "No se encontró el estado." : "Escribe para buscar..."}
            </CommandEmpty>
            <ScrollArea className="h-60 overflow-auto"  onWheel={(e) => e.stopPropagation()}>
              <CommandGroup>
                <CommandItem
                  key="unspecified"
                  value="sin especificar"
                  onSelect={() => handleSelect(undefined)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Sin especificar
                </CommandItem>
                {filteredStates.map((state) => (
                  <CommandItem
                    key={state.id}
                    value={state.name.toLowerCase()}
                    onSelect={() => handleSelect(state)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === state.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {state.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
