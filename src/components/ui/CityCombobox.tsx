
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useDebounce } from '@/hooks/useDebounce';

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
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { showError } = useFleetNotifications();

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (stateId && debouncedSearchTerm !== undefined) {
      searchCities(debouncedSearchTerm, 0, true);
    } else if (stateId && debouncedSearchTerm === undefined) {
      // Initial load without search term
      searchCities("", 0, true);
    } else {
      setCities([]);
      setHasMore(false);
      // Clear selection if state changes
      if (value) {
        onValueChange(undefined);
      }
    }
  }, [stateId, debouncedSearchTerm]);

  const searchCities = async (term: string, page: number, reset = false) => {
    if (!stateId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-cities', {
        body: {
          stateId,
          searchTerm: term,
          page,
          limit: 100
        }
      });

      if (error) throw error;

      const newCities = data.cities || [];
      
      if (reset) {
        setCities(newCities);
      } else {
        setCities(prev => [...prev, ...newCities]);
      }
      
      setHasMore(data.hasMore || false);
      setCurrentPage(page);
      
      console.log(`🔍 Loaded ${newCities.length} cities for "${term}" (page ${page})`);
    } catch (error) {
      console.error('Error searching cities:', error);
      showError("Error", "No se pudieron cargar las ciudades");
      setCities([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreCities = () => {
    if (hasMore && !loading) {
      searchCities(debouncedSearchTerm || "", currentPage + 1, false);
    }
  };

  const selectedCity = cities.find((city) => city.id === value);

  const getPlaceholderText = () => {
    if (loading) return "Cargando ciudades...";
    if (!stateId) return "Primero selecciona un estado";
    return placeholder;
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || !stateId}
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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar ciudad..." 
            className="h-9"
            value={searchTerm}
            onValueChange={handleSearchChange}
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
                {hasMore && (
                  <CommandItem
                    key="load-more"
                    value="load-more"
                    onSelect={loadMoreCities}
                    className="text-center text-primary cursor-pointer"
                  >
                    {loading ? "Cargando más..." : "Cargar más ciudades..."}
                  </CommandItem>
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
