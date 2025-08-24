
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';

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
  placeholder,
  disabled = false
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { showError } = useFleetNotifications();
  const { t, ready, i18n } = useTranslation('common');

  // Helper function to get translated text with fallbacks based on current language
  const getTranslation = (key: string, enFallback: string, esFallback: string) => {
    if (!ready) return i18n.language === 'es' ? esFallback : enFallback;
    const translation = t(key);
    return translation === key ? (i18n.language === 'es' ? esFallback : enFallback) : translation;
  };

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

  // Load cities when component mounts and has a value to display
  useEffect(() => {
    if (stateId && value && cities.length === 0) {
      searchCities("", 0, true);
    }
  }, [stateId, value]);

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
      showError(getTranslation('address.error_loading', 'Error loading data', 'Error al cargar datos'));
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

  const selectedCity = cities.find((city) => city.name === value);

  const getPlaceholderText = () => {
    if (loading) return getTranslation('address.loading', 'Loading...', 'Cargando...');
    if (!stateId) return getTranslation('address.state_select_placeholder', 'Select state...', 'Selecciona estado...');
    return placeholder || getTranslation('address.city_select_placeholder', 'Select city...', 'Selecciona ciudad...');
  };

  const getDisplayText = () => {
    if (selectedCity) {
      return (
        <span>
          {selectedCity.name}
          {selectedCity.county && (
            <span className="text-muted-foreground ml-1">({selectedCity.county})</span>
          )}
        </span>
      );
    }
    
    // If we have a value but selectedCity is not found (cities not loaded yet), show the value
    if (value) {
      return <span>{value}</span>;
    }
    
    return getPlaceholderText();
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
            {getDisplayText()}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border shadow-md" style={{ zIndex: 10000 }}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={getTranslation('address.search', 'Search...', 'Buscar...')} 
            className="h-9"
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {loading 
                ? getTranslation('address.loading', 'Loading...', 'Cargando...') 
                : searchTerm 
                  ? getTranslation('address.no_results', 'No results found.', 'No se encontraron resultados.') 
                  : getTranslation('address.search', 'Search...', 'Buscar...')
              }
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
                  {getTranslation('address.city_select_placeholder', 'Select city...', 'Selecciona ciudad...')}
                </CommandItem>
                {cities.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={`${city.name.toLowerCase()}${city.county ? ` ${city.county.toLowerCase()}` : ''}`}
                    onSelect={() => {
                      onValueChange(city.name === value ? undefined : city.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === city.name ? "opacity-100" : "opacity-0"
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
                    {loading ? getTranslation('address.loading', 'Loading...', 'Cargando...') : getTranslation('address.load_more', 'Load more...', 'Cargar más...')}
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
