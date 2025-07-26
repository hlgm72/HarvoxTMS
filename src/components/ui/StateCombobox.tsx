
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            {selectedState ? selectedState.name : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
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
