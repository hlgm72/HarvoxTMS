import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useFacilities, Facility } from '@/hooks/useFacilities';
import { useTranslation } from 'react-i18next';

interface FacilityComboboxProps {
  value?: string | null;
  onValueChange: (facilityId: string | null, facility?: Facility) => void;
  onCreateNew: () => void;
  disabled?: boolean;
}

export function FacilityCombobox({
  value,
  onValueChange,
  onCreateNew,
  disabled = false,
}: FacilityComboboxProps) {
  const { t } = useTranslation('facilities');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: facilities = [], isLoading } = useFacilities();
  
  // Filter only active facilities
  const activeFacilities = facilities.filter(f => f.is_active);
  
  const selectedFacility = activeFacilities.find(f => f.id === value);

  const filteredFacilities = activeFacilities.filter(facility =>
    facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    facility.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    facility.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {selectedFacility ? (
                  <span className="font-normal">
                    {selectedFacility.name}
                    {selectedFacility.city && (
                      <span className="text-muted-foreground ml-1">
                        - {selectedFacility.city}, {selectedFacility.state}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t('combobox.select_facility')}
                  </span>
                )}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('combobox.search_placeholder')}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="py-6 text-center text-sm">
                    {t('combobox.loading')}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm">
                    {t('combobox.no_results')}
                  </div>
                )}
              </CommandEmpty>
              {filteredFacilities.length > 0 && (
                <CommandGroup>
                  {filteredFacilities.map((facility) => (
                    <CommandItem
                      key={facility.id}
                      value={facility.id}
                      onSelect={() => {
                        onValueChange(
                          facility.id === value ? null : facility.id,
                          facility.id === value ? undefined : facility
                        );
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === facility.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{facility.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {facility.address}
                          {facility.city && `, ${facility.city}, ${facility.state}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onCreateNew}
        disabled={disabled}
        title={t('combobox.create_new')}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
