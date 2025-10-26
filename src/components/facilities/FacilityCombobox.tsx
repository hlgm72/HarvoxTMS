import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, Search, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onEdit?: (facility: Facility) => void;
  disabled?: boolean;
}

export function FacilityCombobox({
  value,
  onValueChange,
  onCreateNew,
  onEdit,
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
            <div className="flex items-center gap-2 truncate flex-1">
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
            {selectedFacility && onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(selectedFacility);
                }}
                title={t('combobox.edit_facility')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={t('combobox.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div 
            className="max-h-[300px] overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Loading state */}
            {isLoading && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t('combobox.loading')}
              </div>
            )}

            {/* No results */}
            {!isLoading && filteredFacilities.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t('combobox.no_results')}
              </div>
            )}

            {/* Results */}
            {!isLoading && filteredFacilities.map((facility) => (
              <div
                key={facility.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  value === facility.id && 'bg-accent'
                )}
                onClick={() => {
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
              </div>
            ))}
          </div>
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
