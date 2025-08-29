import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FormControl } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface ComboboxOption {
  value: string;
  label: string;
  popular?: boolean;
}

interface ComboboxFieldProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  customText?: string;
  searchHook?: (searchTerm: string) => { commodities: ComboboxOption[]; isLoading: boolean };
}

export function ComboboxField({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona una opción...",
  emptyText = "No se encontraron opciones.",
  allowCustom = true,
  customText = "Agregar personalizado",
  searchHook
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Use search hook if provided, otherwise use static options
  const searchResults = searchHook ? searchHook(search) : { commodities: [], isLoading: false };
  const displayOptions = searchHook ? searchResults.commodities : options;

  // Buscar la opción seleccionada
  const selectedOption = displayOptions.find((option) => option.value === value);

  // Filtrar opciones basado en la búsqueda (solo para opciones estáticas)
  const filteredOptions = searchHook ? displayOptions : displayOptions.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Separar opciones populares y regulares
  const popularOptions = filteredOptions.filter(option => option.popular);
  const regularOptions = filteredOptions.filter(option => !option.popular);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange("");
    } else {
      onValueChange(selectedValue);
    }
    setOpen(false);
    setSearch("");
  };

  const handleCustomAdd = () => {
    if (search.trim() && !displayOptions.find(opt => opt.label.toLowerCase() === search.toLowerCase())) {
      onValueChange(search.trim());
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {selectedOption ? (
                <>
                  {selectedOption.label}
                  {selectedOption.popular && (
                    <Badge variant="secondary" className="text-xs">
                      Popular
                    </Badge>
                  )}
                </>
              ) : (
                placeholder
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white z-50" align="start">
        <Command>
          <CommandInput
            placeholder={searchHook ? "Escribe para buscar commodities..." : "Buscar marca..."}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="text-center py-2">
                {searchHook && searchResults.isLoading ? (
                  <p className="text-sm text-muted-foreground">Buscando...</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
                    {allowCustom && search.trim() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCustomAdd}
                        className="text-xs"
                      >
                        {customText}: "{search}"
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CommandEmpty>
            
            {popularOptions.length > 0 && (
              <CommandGroup heading={searchHook ? "Commodities Frecuentes" : "Marcas Populares"}>
                {popularOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      {option.label}
                      {option.popular && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {regularOptions.length > 0 && (
              <CommandGroup heading={popularOptions.length > 0 ? (searchHook ? "Otras Commodities" : "Otras Marcas") : (searchHook ? "Commodities Disponibles" : "Marcas Disponibles")}>
                {regularOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {allowCustom && search.trim() && filteredOptions.length > 0 && (
              <CommandGroup>
                <CommandItem onSelect={handleCustomAdd}>
                  <div className="w-full text-center text-sm text-muted-foreground">
                    {customText}: "{search}"
                  </div>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}