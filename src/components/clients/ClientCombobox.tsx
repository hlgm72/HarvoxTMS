import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyClient, ClientContact } from '@/hooks/useCompanyClients';

interface ClientComboboxProps {
  clients: CompanyClient[];
  value?: string;
  onValueChange: (value: string) => void;
  onClientSelect?: (client: CompanyClient | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clients,
  value,
  onValueChange,
  onClientSelect,
  placeholder = "Seleccionar cliente...",
  disabled = false,
  className,
  side = "bottom"
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedClient = clients.find(client => client.id === value);

  const handleSelect = (clientId: string) => {
    const newValue = clientId === value ? "" : clientId;
    onValueChange(newValue);
    
    if (onClientSelect) {
      const client = newValue ? clients.find(c => c.id === newValue) || null : null;
      onClientSelect(client);
    }
    
    setOpen(false);
  };

  const formatClientDisplay = (client: CompanyClient) => {
    const parts = [client.name];
    if (client.alias) parts.push(`(${client.alias})`);
    if (client.mc_number) parts.push(`MC: ${client.mc_number}`);
    return parts.join(' ');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedClient ? formatClientDisplay(selectedClient) : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0" side={side}>
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.alias || ''} ${client.mc_number || ''}`}
                  onSelect={() => handleSelect(client.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatClientDisplay(client)}</div>
                      {client.address && (
                        <div className="text-sm text-muted-foreground">{client.address}</div>
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
  );
};