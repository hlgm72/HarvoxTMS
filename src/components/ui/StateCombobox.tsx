
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

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
  placeholder,
  disabled = false 
}: StateComboboxProps) {
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { showError } = useFleetNotifications();
  const { t } = useTranslation('common');

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
      showError(t('address.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const selectedState = states.find((state) => state.id === value);
  
  const filteredStates = states.filter((state) =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          <div className="flex items-center">
            {selectedState ? selectedState.name : (placeholder || t('address.state_select_placeholder', 'Selecciona estado...'))}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border shadow-md" style={{ zIndex: 10000 }}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('address.search', 'Buscar...')} 
            className="h-9"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? t('address.loading', 'Cargando...') : searchTerm ? t('address.no_results', 'No se encontraron resultados.') : t('address.search', 'Buscar...')}
            </CommandEmpty>
            <ScrollArea className="h-60 overflow-auto"  onWheel={(e) => e.stopPropagation()}>
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
                  {t('address.state_select_placeholder', 'Selecciona estado...')}
                </CommandItem>
                {filteredStates.map((state) => (
                  <CommandItem
                    key={state.id}
                    value={state.name.toLowerCase()}
                    onSelect={() => {
                      onValueChange(state.id === value ? undefined : state.id);
                      setOpen(false);
                    }}
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
