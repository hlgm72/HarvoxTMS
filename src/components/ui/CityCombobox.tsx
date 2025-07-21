
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: "No se pudieron cargar las ciudades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCity = cities.find((city) => city.id === value);

  const getPlaceholderText = () => {
    if (loading) return "Cargando ciudades...";
    if (!stateId) return "Primero selecciona un estado";
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading || !stateId}
        >
          <div className="flex items-center">
            <Building className="mr-2 h-4 w-4 text-muted-foreground" />
            {selectedCity ? (
              <span>
                {selectedCity.name}
                {selectedCity.county && (
                  <span className="text-muted-foreground ml-1">({selectedCity.county})</span>
                )}
              </span>
            ) : (
              getPlaceholderText()
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border shadow-md" style={{ zIndex: 10000 }}>
        <Command>
          <CommandInput placeholder="Buscar ciudad..." className="h-9" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>
              {loading ? "Cargando ciudades..." : "No se encontró la ciudad."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="unspecified"
                value="sin especificar"
                onSelect={() => {
                  onValueChange(undefined);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                Sin especificar
              </CommandItem>
              {cities.map((city) => (
                <CommandItem
                  key={city.id}
                  value={`${city.name.toLowerCase()}${city.county ? ` ${city.county.toLowerCase()}` : ''}`}
                  onSelect={() => {
                    onValueChange(city.id === value ? undefined : city.id);
                    setOpen(false);
                  }}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
