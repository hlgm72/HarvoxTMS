import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyAddressAutocomplete } from '@/hooks/useCompanyAddressAutocomplete';

interface CompanyAddressAutocompleteProps {
  onSelectCompany: (address: {
    name: string;
    streetAddress: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) => void;
  placeholder?: string;
  label?: string;
}

export function CompanyAddressAutocomplete({
  onSelectCompany,
  placeholder = "Buscar empresa...",
  label = "Empresa"
}: CompanyAddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  
  const { companies, isLoading, searchTerm, setSearchTerm } = useCompanyAddressAutocomplete();

  const handleSelect = (company: any) => {
    setSelectedCompany(company.name);
    setOpen(false);
    
    onSelectCompany({
      name: company.name,
      streetAddress: company.address,
      city: company.city,
      state: company.state,
      zipCode: company.zipCode
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              {selectedCompany || placeholder}
            </div>
            <Check
              className={cn(
                "ml-2 h-4 w-4",
                open ? "opacity-100" : "opacity-50"
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Buscar empresa..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>
              {isLoading ? "Buscando..." : "No se encontraron empresas."}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.id}
                  onSelect={() => handleSelect(company)}
                  className="flex items-center gap-2"
                >
                  <Building className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{company.name}</span>
                    {company.address && (
                      <span className="text-sm text-muted-foreground">
                        {company.address}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}