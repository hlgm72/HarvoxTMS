import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CompanyClient, ClientContact } from '@/hooks/useCompanyClients';
import { useTranslation } from 'react-i18next';

interface ClientComboboxProps {
  clients: CompanyClient[];
  value?: string;
  onValueChange: (value: string) => void;
  onClientSelect?: (client: CompanyClient | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  onCreateNew?: (searchTerm: string) => void;
}

export const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clients,
  value,
  onValueChange,
  onClientSelect,
  placeholder,
  disabled = false,
  className,
  side = "bottom",
  onCreateNew
}) => {
  const { t } = useTranslation('clients');
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

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
    if (client.mc_number) parts.push(`MC: ${client.mc_number}`);
    return parts.join(' • ');
  };

  // Custom filter function for consecutive character matching
  const filterClients = (value: string, search: string) => {
    const searchLower = search.toLowerCase();
    const valueLower = value.toLowerCase();
    
    // If search is empty, show all
    if (!searchLower) return 1;
    
    // Check if search term appears as consecutive characters in value
    return valueLower.includes(searchLower) ? 1 : 0;
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
              {selectedClient ? formatClientDisplay(selectedClient) : placeholder || t('actions.select_client')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] max-h-[400px] p-0" side={side}>
        <Command filter={filterClients} className="h-full">
          <div className="flex items-center border-b px-3">
            <CommandInput 
              placeholder={t('actions.search_client')} 
              className="flex-1"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            {onCreateNew && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onCreateNew(searchValue);
                }}
                className="ml-2 h-8 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('actions.create')}
              </Button>
            )}
          </div>
          <CommandList className="overflow-y-auto">
            <CommandEmpty>{t('messages.no_clients_found')}</CommandEmpty>
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
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={client.logo_url} alt={client.name} />
                      <AvatarFallback className="text-xs">
                        <Building2 className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
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