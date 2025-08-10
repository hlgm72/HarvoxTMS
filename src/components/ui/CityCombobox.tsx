
import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface City {
  id: string;
  name: string;
  county?: string;
  state_id: string;
}

interface CityComboboxProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  stateId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CityCombobox({ 
  value, 
  onValueChange, 
  stateId,
  placeholder = "Selecciona ciudad...",
  disabled = false 
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { showError } = useFleetNotifications();

  useEffect(() => {
    if (stateId) {
      loadCities(stateId);
    } else {
      setCities([]);
      // Clear selection if state changes
      if (value) {
        onValueChange(undefined);
      }
    }
  }, [stateId]);

  const loadCities = async (stateId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('state_cities')
        .select('id, name, county, state_id')
        .eq('state_id', stateId)
        .order('name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
      showError("Error", "No se pudieron cargar las ciudades");
    } finally {
      setLoading(false);
    }
  };

  const selectedCity = cities.find((city) => city.id === value);
  
  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes((inputValue || searchTerm).toLowerCase()) ||
    (city.county && city.county.toLowerCase().includes((inputValue || searchTerm).toLowerCase()))
  );

  const getPlaceholderText = () => {
    if (loading) return "Cargando ciudades...";
    if (!stateId) return "Primero selecciona un estado";
    return placeholder;
  };

  // Update input value when selection changes
  useEffect(() => {
    if (selectedCity && !open) {
      setInputValue(selectedCity.name);
    } else if (!selectedCity && !open) {
      setInputValue("");
    }
  }, [selectedCity, open]);

  // Clear input when state changes
  useEffect(() => {
    if (!stateId) {
      setInputValue("");
    }
  }, [stateId]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSearchTerm(value);
    if (!open && stateId) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (stateId) {
      setOpen(true);
    }
  };

  const handleSelect = (city: City | undefined) => {
    onValueChange(city?.id);
    setOpen(false);
    if (city) {
      setInputValue(city.name);
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
            placeholder={getPlaceholderText()}
            disabled={disabled || loading || !stateId}
            className="pr-8"
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border shadow-md" style={{ zIndex: 10000 }}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar ciudad..." 
            className="h-9"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Cargando ciudades..." : searchTerm ? "No se encontró la ciudad." : "Escribe para buscar..."}
            </CommandEmpty>
            <ScrollArea className="h-60">
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
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={`${city.name.toLowerCase()}${city.county ? ` ${city.county.toLowerCase()}` : ''}`}
                    onSelect={() => handleSelect(city)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === city.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div>{city.name}</div>
                      {city.county && (
                        <div className="text-sm text-muted-foreground">{city.county}</div>
                      )}
                    </div>
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
