import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CompanyBroker, BrokerDispatcher } from '@/hooks/useCompanyBrokers';
import { Badge } from '@/components/ui/badge';

interface BrokerComboboxProps {
  brokers: CompanyBroker[];
  loading?: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  onCreateNew: () => void;
  placeholder?: string;
  className?: string;
  // Para mostrar dispatchers del broker seleccionado
  onBrokerSelect?: (broker: CompanyBroker | null) => void;
}

export function BrokerCombobox({
  brokers,
  loading = false,
  value,
  onValueChange,
  onCreateNew,
  placeholder = "Buscar broker...",
  className,
  onBrokerSelect
}: BrokerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar brokers por múltiples criterios
  const filteredBrokers = useMemo(() => {
    if (!searchQuery.trim()) return brokers;

    const query = searchQuery.toLowerCase().trim();
    return brokers.filter(broker => 
      broker.name.toLowerCase().includes(query) ||
      broker.alias?.toLowerCase().includes(query) ||
      broker.dot_number?.toLowerCase().includes(query) ||
      broker.mc_number?.toLowerCase().includes(query) ||
      broker.email_domain?.toLowerCase().includes(query)
    );
  }, [brokers, searchQuery]);

  const selectedBroker = brokers.find(broker => broker.id === value);

  const handleSelect = (brokerId: string) => {
    onValueChange(brokerId === value ? '' : brokerId);
    const broker = brokers.find(b => b.id === brokerId);
    onBrokerSelect?.(broker || null);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setOpen(false);
    onCreateNew();
  };

  const formatBrokerDisplay = (broker: CompanyBroker) => {
    const parts = [broker.name];
    if (broker.alias) parts.push(`(${broker.alias})`);
    if (broker.dot_number) parts.push(`DOT: ${broker.dot_number}`);
    if (broker.mc_number) parts.push(`MC: ${broker.mc_number}`);
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
          disabled={loading}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {selectedBroker ? selectedBroker.name : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Buscar por nombre, alias, DOT, MC..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex h-11"
            />
          </div>
          
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm">
              <div className="flex flex-col items-center gap-2">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <p>No se encontraron brokers</p>
                <p className="text-xs text-muted-foreground">
                  Intenta con otro término de búsqueda
                </p>
              </div>
            </CommandEmpty>
            
            <CommandGroup>
              {/* Opción para crear nuevo broker */}
              <CommandItem
                onSelect={handleCreateNew}
                className="flex items-center gap-2 p-3 cursor-pointer border-b bg-muted/50"
              >
                <Plus className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-primary">Crear Nuevo Broker</span>
                  <span className="text-xs text-muted-foreground">
                    Agregar un nuevo broker al sistema
                  </span>
                </div>
              </CommandItem>

              {/* Lista de brokers filtrados */}
              {filteredBrokers.map((broker) => (
                <CommandItem
                  key={broker.id}
                  value={broker.id}
                  onSelect={() => handleSelect(broker.id)}
                  className="flex items-center gap-2 p-3 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === broker.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{broker.name}</span>
                      {broker.alias && (
                        <Badge variant="secondary" className="text-xs">
                          {broker.alias}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {broker.dot_number && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          DOT: {broker.dot_number}
                        </span>
                      )}
                      {broker.mc_number && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          MC: {broker.mc_number}
                        </span>
                      )}
                      {broker.dispatchers && broker.dispatchers.length > 0 && (
                        <span className="text-primary">
                          {broker.dispatchers.length} dispatcher{broker.dispatchers.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    {broker.email_domain && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📧 {broker.email_domain}
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
  );
}