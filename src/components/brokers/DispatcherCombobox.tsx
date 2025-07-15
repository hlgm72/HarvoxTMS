import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, User, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BrokerDispatcher } from "@/hooks/useCompanyBrokers";

interface DispatcherComboboxProps {
  dispatchers: BrokerDispatcher[];
  value?: string;
  onValueChange: (value: string) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DispatcherCombobox({
  dispatchers,
  value,
  onValueChange,
  onCreateNew,
  placeholder = "Seleccionar dispatcher...",
  disabled = false,
  className
}: DispatcherComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedDispatcher = useMemo(() => {
    return dispatchers.find(dispatcher => dispatcher.id === value);
  }, [dispatchers, value]);

  const filteredDispatchers = useMemo(() => {
    if (!searchValue) return dispatchers;
    
    const searchLower = searchValue.toLowerCase();
    return dispatchers.filter(dispatcher =>
      dispatcher.name.toLowerCase().includes(searchLower) ||
      dispatcher.email?.toLowerCase().includes(searchLower) ||
      dispatcher.phone_office?.includes(searchValue) ||
      dispatcher.phone_mobile?.includes(searchValue)
    );
  }, [dispatchers, searchValue]);

  const handleSelect = (dispatcherId: string) => {
    onValueChange(dispatcherId === value ? "" : dispatcherId);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
      setOpen(false);
      setSearchValue("");
    }
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
              Sin dispatchers disponibles
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty className="p-4">
                  <div className="text-center">
                    <User className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No hay dispatchers para este broker
                    </p>
                    {onCreateNew && (
                      <Button
                        size="sm"
                        onClick={handleCreateNew}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Dispatcher
                      </Button>
                    )}
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
                <span className="truncate">{selectedDispatcher.name}</span>
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
                  <p className="text-sm text-muted-foreground mb-3">
                    No se encontraron dispatchers que coincidan con "{searchValue}"
                  </p>
                  {onCreateNew && (
                    <Button
                      size="sm"
                      onClick={handleCreateNew}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Nuevo Dispatcher
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              <CommandGroup>
                {onCreateNew && (
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-l-green-500 dark:from-green-950/20 dark:to-blue-950/20"
                  >
                    <Plus className="mr-2 h-4 w-4 text-green-600" />
                    <div className="flex flex-col">
                      <span className="font-medium text-green-700 dark:text-green-400">
                        Crear Nuevo Dispatcher
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-500">
                        Agregar un nuevo contacto para este broker
                      </span>
                    </div>
                  </CommandItem>
                )}
                
                {filteredDispatchers.map((dispatcher) => (
                  <CommandItem
                    key={dispatcher.id}
                    value={dispatcher.id}
                    onSelect={() => handleSelect(dispatcher.id)}
                    className="cursor-pointer p-3"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === dispatcher.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{dispatcher.name}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        {dispatcher.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{dispatcher.email}</span>
                          </div>
                        )}
                        
                        {(dispatcher.phone_office || dispatcher.phone_mobile) && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>
                              {dispatcher.phone_office || dispatcher.phone_mobile}
                              {dispatcher.extension && ` ext. ${dispatcher.extension}`}
                            </span>
                          </div>
                        )}
                      </div>
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