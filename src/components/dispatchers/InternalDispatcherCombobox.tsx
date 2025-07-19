import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CompanyDispatcher } from "@/hooks/useCompanyDispatchers";

interface InternalDispatcherComboboxProps {
  dispatchers: CompanyDispatcher[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function InternalDispatcherCombobox({
  dispatchers,
  value,
  onValueChange,
  placeholder = "Seleccionar dispatcher interno...",
  disabled = false,
  className
}: InternalDispatcherComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedDispatcher = useMemo(() => {
    return dispatchers.find(dispatcher => dispatcher.user_id === value);
  }, [dispatchers, value]);

  const filteredDispatchers = useMemo(() => {
    if (!searchValue) return dispatchers;
    
    const searchLower = searchValue.toLowerCase();
    return dispatchers.filter(dispatcher => {
      const fullName = `${dispatcher.first_name || ''} ${dispatcher.last_name || ''}`.trim();
      return fullName.toLowerCase().includes(searchLower) ||
             dispatcher.phone?.includes(searchValue);
    });
  }, [dispatchers, searchValue]);

  const handleSelect = (dispatcherId: string) => {
    onValueChange(dispatcherId === value ? "" : dispatcherId);
    setOpen(false);
    setSearchValue("");
  };

  if (!dispatchers || dispatchers.length === 0) {
    return (
      <div className={cn("flex", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between text-muted-foreground"
              disabled={disabled}
            >
              Sin dispatchers internos disponibles
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty className="p-4">
                  <div className="text-center">
                    <User className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No hay dispatchers internos en esta compañía
                    </p>
                  </div>
                </CommandEmpty>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn("flex", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between"
            disabled={disabled}
          >
            {selectedDispatcher ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {`${selectedDispatcher.first_name || ''} ${selectedDispatcher.last_name || ''}`.trim() || 'Dispatcher'}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar dispatcher..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty className="p-4">
                <div className="text-center">
                  <User className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron dispatchers que coincidan con "{searchValue}"
                  </p>
                </div>
              </CommandEmpty>
              
              <CommandGroup>
                {filteredDispatchers.map((dispatcher) => (
                  <CommandItem
                    key={dispatcher.user_id}
                    value={dispatcher.user_id}
                    onSelect={() => handleSelect(dispatcher.user_id)}
                    className="cursor-pointer p-3"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === dispatcher.user_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">
                          {`${dispatcher.first_name || ''} ${dispatcher.last_name || ''}`.trim() || 'Dispatcher'}
                        </span>
                      </div>
                      
                      {dispatcher.phone && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{dispatcher.phone}</span>
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}